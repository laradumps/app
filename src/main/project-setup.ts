import { BrowserWindow, dialog, IpcMainEvent, Notification } from 'electron';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { exec, execSync } from 'child_process';
import isWsl from 'is-wsl';
import { Logger } from './logger/logger';
import { IpcLogDriver } from './logger/ipc-log-driver';
import { ConsoleLogDriver } from './logger/console-log-driver';

const isWindows = process.platform === 'win32';

let cachedShellPath: string | null = null;

const getLoginShellPath = (): string => {
    if (cachedShellPath !== null) return cachedShellPath;
    cachedShellPath = '';

    if (isWindows) return cachedShellPath;

    try {
        const shell = process.env.SHELL || '/bin/zsh';
        const out = execSync(`${shell} -ilc 'printf "__LD_PATH__%s__LD_PATH__" "$PATH"'`, {
            encoding: 'utf8',
            timeout: 5000,
            stdio: ['ignore', 'pipe', 'ignore']
        });
        const match = out.match(/__LD_PATH__([\s\S]*?)__LD_PATH__/);
        cachedShellPath = (match ? match[1] : '').trim();
    } catch (_e) {
        cachedShellPath = '';
    }

    return cachedShellPath;
};

const getCommonShimDirs = (): string[] => {
    if (isWindows) return [];
    const home = os.homedir();
    return [
        path.join(home, '.proto', 'shims'),
        path.join(home, '.proto', 'bin'),
        path.join(home, '.asdf', 'shims'),
        path.join(home, '.local', 'share', 'mise', 'shims'),
        path.join(home, '.config', 'herd-lite', 'bin'),
        path.join(home, 'Library', 'Application Support', 'Herd', 'bin')
    ].filter((dir) => fs.existsSync(dir));
};

const CHANNELS = {
    COMPOSER_AUTO_INSTALL: 'composer-auto-install',
    PROJECT_DIRECTORY_SELECTED: 'project-directory-selected',
    PROJECT_SETUP_LOGS: 'project-setup-logs'
};

let notifyLock = false;

const notifyOnce = (title: string, body: string) => {
    if (notifyLock) return;
    notifyLock = true;
    new Notification({ title, body }).show();
    setTimeout(() => (notifyLock = false), 1000);
};

const runCommand = (command: string, cwd: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const isDarwin = process.platform === 'darwin';
        const isLinux = process.platform === 'linux';
        const staticPaths = isDarwin
            ? '/opt/homebrew/bin:/usr/local/bin:/opt/local/bin:/usr/bin:/bin:/usr/sbin:/sbin'
            : isLinux
              ? '/usr/local/bin:/usr/bin:/bin'
              : '';

        const segments = [
            getLoginShellPath(),
            getCommonShimDirs().join(path.delimiter),
            staticPaths,
            process.env.PATH ?? ''
        ]
            .filter(Boolean)
            .join(path.delimiter)
            .split(path.delimiter)
            .filter(Boolean);

        const seen = new Set<string>();
        const PATH = segments.filter((dir) => (seen.has(dir) ? false : (seen.add(dir), true))).join(path.delimiter);

        exec(command, { cwd, env: { ...process.env, PATH } }, (error, stdout, stderr) => {
            if (error) {
                console.error(stderr || error.message);
                reject(new Error(stderr || error.message));
                return;
            }
            console.log(stdout);
            resolve(stdout);
        });
    });
};

const isWSL = (): boolean => {
    return isWsl;
};

const isDdevRunning = async (projectPath: string): Promise<boolean> => {
    const ddevDir = path.join(projectPath, '.ddev');
    if (!fs.existsSync(ddevDir)) return false;
    try {
        await runCommand(`ddev --version`, projectPath);
        const desc = await runCommand(`ddev describe -j`, projectPath);
        const data = JSON.parse(desc);
        const raw = (data && data.raw) || undefined;
        const status: string | undefined = raw?.services?.web?.status;
        return status === 'running';
    } catch (_e) {
        return false;
    }
};

const isLaraDumpsAlreadyInstalled = (projectPath: string): boolean => {
    try {
        const composerJson = JSON.parse(fs.readFileSync(path.join(projectPath, 'composer.json'), 'utf8'));
        const deps = { ...(composerJson.require || {}), ...(composerJson['require-dev'] || {}) };
        const declared = 'laradumps/laradumps-core' in deps || 'laradumps/laradumps' in deps;
        if (!declared) return false;

        return (
            fs.existsSync(path.join(projectPath, 'vendor', 'laradumps', 'laradumps-core')) ||
            fs.existsSync(path.join(projectPath, 'vendor', 'laradumps', 'laradumps'))
        );
    } catch (_e) {
        return false;
    }
};

const getComposerCandidates = async (projectPath: string): Promise<string[]> => {
    const candidates: string[] = [];

    if (await isDdevRunning(projectPath)) {
        candidates.push('ddev composer');
    }

    const composerPhar = path.join(projectPath, 'composer.phar');
    if (fs.existsSync(composerPhar)) {
        candidates.push(`php "${composerPhar}"`);
    }

    if (isWindows && !isWSL()) {
        candidates.push('composer.bat');
    } else {
        candidates.push('composer');
    }

    return candidates;
};

const installLaraDumps = async (projectPath: string, logger: Logger) => {
    const artisanPath = path.join(projectPath, 'artisan');
    const errors: string[] = [];

    if (fs.existsSync(artisanPath)) {
        try {
            logger.info(`Checking if DDEV is running...`);
            if (await isDdevRunning(projectPath)) {
                logger.info(`DDEV is running. Retrying with DDEV...`);
                await runCommand(`ddev artisan ds:init "${projectPath}"`, projectPath);
                logger.info(`DDEV initialization successful.`);
                return;
            }
        } catch (e) {
            const msg = (e as Error)?.message || String(e);
            console.warn(`DDEV failed. Retrying with Sail/PHP...`, msg);
            errors.push(`DDEV: ${msg}`);
            logger.warn(`DDEV failed. Retrying with Sail/PHP...`, msg);
        }

        const sailPath = path.join(projectPath, 'vendor', 'bin', isWindows ? 'sail.bat' : 'sail');
        logger.info(`Checking if Laravel Sail is present...`);
        if (fs.existsSync(sailPath)) {
            logger.info(`Laravel Sail found. Retrying with Sail...`);
            try {
                console.log(`Using Sail to run artisan commands.`, sailPath);
                logger.info(`Using Sail to run artisan commands...`);
                logger.info(`Executing: ${sailPath} artisan ds:init "${projectPath}"`);
                await runCommand(`${sailPath} artisan ds:init "${projectPath}"`, projectPath);
                return;
            } catch (e) {
                const msg = (e as Error)?.message || String(e);
                console.warn(`Sail failed. Retrying with PHP...`, msg);
                errors.push(`Sail: ${msg}`);
                logger.warn(`Sail failed. Retrying with PHP... Error: ${msg}`);
            }
        }

        try {
            console.log(`Using PHP to run artisan commands.`, artisanPath);
            logger.info(`Using PHP to run artisan commands: php artisan ds:init "${projectPath}"`);
            await runCommand(`php artisan ds:init "${projectPath}"`, projectPath);
            logger.info(`PHP initialization successful.`);
            return;
        } catch (e) {
            const msg = (e as Error)?.message || String(e);
            console.warn(`PHP artisan failed. Retrying with LaraDumps binary...`, msg);
            errors.push(`PHP: ${msg}`);
            logger.warn(`PHP artisan failed. Retrying with LaraDumps binary... Error: ${msg}`);
        }
    }

    const bin = isWindows
        ? path.join(projectPath, 'vendor', 'bin', 'laradumps.bat')
        : path.join(projectPath, 'vendor', 'bin', 'laradumps');

    console.log(`Using binary commands.`, bin);
    logger.info(`Using LaraDumps binary: ${bin}`);

    if (!fs.existsSync(bin)) {
        logger.error(`LaraDumps binary not found. Please run "composer require".`);
        throw new Error('LaraDumps binary not found. Please run "composer require".');
    }

    try {
        logger.info(`Executing: ${bin} init`);
        await runCommand(`${bin} init`, projectPath);
        logger.info(`LaraDumps binary initialization successful.`);
        return;
    } catch (e) {
        const msg = (e as Error)?.message || String(e);
        errors.push(`Binary: ${msg}`);
        logger.error(`LaraDumps binary initialization failed. Details: ${errors.join(' | ')}`);
        throw new Error(`Failed to initialize via Sail, PHP, and binary. Details: ${errors.join(' | ')}`);
    }
};

const composerAutoInstall = async (mainWindow: BrowserWindow, selectedDir: string): Promise<void> => {
    const logger = new Logger([
        new ConsoleLogDriver(),
        new IpcLogDriver(mainWindow, CHANNELS.PROJECT_SETUP_LOGS, { step: 'setup-logs' })
    ]);

    try {
        const composerJsonPath = path.join(selectedDir, 'composer.json');
        mainWindow.webContents.send(CHANNELS.COMPOSER_AUTO_INSTALL, { status: 'start', path: selectedDir });
        logger.info(`Installing LaraDumps: ${selectedDir}`);

        if (!fs.existsSync(composerJsonPath)) {
            mainWindow.webContents.send(CHANNELS.COMPOSER_AUTO_INSTALL, {
                error: 'composer.json not found in the selected directory. Please select a Composer project root.'
            });
            notifyOnce('LaraDumps', 'composer.json not found in the selected directory.');
            return;
        }

        const artisanPath = path.join(selectedDir, 'artisan');

        mainWindow.webContents.send(CHANNELS.COMPOSER_AUTO_INSTALL, { step: 'composer-require', running: true });
        if (isLaraDumpsAlreadyInstalled(selectedDir)) {
            logger.info('LaraDumps is already installed in this project. Skipping composer require.');
        } else {
            const errors: string[] = [];
            const candidates = await getComposerCandidates(selectedDir);
            const requireCmd = fs.existsSync(artisanPath)
                ? 'require laradumps/laradumps laradumps/laradumps-core --dev --ignore-platform-reqs'
                : 'require laradumps/laradumps-core --dev --ignore-platform-reqs';

            let success = false;
            for (const cmd of candidates) {
                logger.info(`Executing Composer require command: ${cmd} ${requireCmd}`);

                try {
                    const command = `${cmd} ${requireCmd}`;
                    console.log(`Running Composer require via: ${command}`);
                    await runCommand(command, selectedDir);
                    success = true;
                    console.log('Composer require successful');

                    logger.info(`Composer require successful via: ${cmd}`);

                    break;
                } catch (e) {
                    const msg = (e as Error)?.message || String(e);
                    console.warn(`Composer require failed with: ${cmd}`, msg);
                    errors.push(`${cmd}: ${msg}`);
                    logger.warn(`Composer require failed with: ${cmd}`);
                }
            }
            if (!success) {
                let message = `Composer require failed via all strategies. Details: ${errors.join(' | ')}.
                Tip: Install Composer (https://getcomposer.org/) or ensure PHP can run a local composer.phar.`;

                logger.error(message);
                throw new Error(message);
            }
        }

        mainWindow.webContents.send(CHANNELS.COMPOSER_AUTO_INSTALL, { step: 'composer-require', done: true });

        mainWindow.webContents.send(CHANNELS.COMPOSER_AUTO_INSTALL, { step: 'remove-config', running: true });
        {
            const configPath = path.join(selectedDir, 'laradumps.yaml');
            logger.info(`Removing existing laradumps.yaml: ${configPath}`);
            if (fs.existsSync(configPath)) {
                fs.unlinkSync(configPath);
                console.log('Removed existing laradumps.yaml');
                logger.info(`Existing laradumps.yaml removed successfully.`);
            } else {
                console.log('No existing laradumps.yaml to remove');
                logger.info(`No existing laradumps.yaml found.`);
            }
        }

        mainWindow.webContents.send(CHANNELS.COMPOSER_AUTO_INSTALL, { step: 'remove-config', done: true });

        mainWindow.webContents.send(CHANNELS.COMPOSER_AUTO_INSTALL, { step: 'ds-init', running: true });
        logger.info(`Running ds:init command: artisan ds:init ${selectedDir}`);
        if (fs.existsSync(artisanPath)) {
            await installLaraDumps(selectedDir, logger);
        } else {
            console.log('artisan not found. Running LaraDumps binary initialization.');
            await installLaraDumps(selectedDir, logger);
        }

        mainWindow.webContents.send(CHANNELS.COMPOSER_AUTO_INSTALL, { step: 'ds-init', done: true });
        logger.info(`ds:init command completed successfully.`);

        mainWindow.webContents.send(CHANNELS.COMPOSER_AUTO_INSTALL, {
            step: 'finish',
            done: true,
            success: true,
            path: selectedDir,
            message: 'LaraDumps installed successfully.'
        });
        notifyOnce('LaraDumps', 'LaraDumps installed successfully.');

        mainWindow.webContents.send(CHANNELS.PROJECT_DIRECTORY_SELECTED, selectedDir);
    } catch (error) {
        console.log(error);
        const message = 'Failed to install LaraDumps. ' + (error as Error).message;
        mainWindow.webContents.send(CHANNELS.COMPOSER_AUTO_INSTALL, {
            error: message
        });
        notifyOnce('LaraDumps', message);
        logger.error(`Failed to install LaraDumps: ${message}`);
    }
};

const selectProjectDirectory = async (
    mainWindow: BrowserWindow,
    _event: IpcMainEvent,
    _args?: unknown
): Promise<void> => {
    try {
        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openDirectory']
        });

        if (result.canceled || result.filePaths.length === 0) {
            mainWindow.webContents.send(CHANNELS.COMPOSER_AUTO_INSTALL, {
                error: 'Operation cancelled by user.'
            });
            notifyOnce('LaraDumps', 'Operation cancelled by user.');
            return;
        }

        const selectedDir = result.filePaths[0];

        await composerAutoInstall(mainWindow, selectedDir);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(err);
        mainWindow.webContents.send(CHANNELS.COMPOSER_AUTO_INSTALL, { error: errorMessage });
        notifyOnce('LaraDumps', errorMessage);
    }
};

export { selectProjectDirectory, composerAutoInstall };
