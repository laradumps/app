import { BrowserWindow, dialog, IpcMainEvent, Notification } from 'electron';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import isWsl from 'is-wsl';
import { Logger } from './logger/logger';
import { IpcLogDriver } from './logger/ipc-log-driver';
import { ConsoleLogDriver } from './logger/console-log-driver';

const isWindows = process.platform === 'win32';

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

// Run a command and return stdout as string (throws on non-zero exit)
const runCommand = (command: string, cwd: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const isDarwin = process.platform === 'darwin';
        const isLinux = process.platform === 'linux';
        const extraPaths = isDarwin
            ? '/opt/homebrew/bin:/usr/local/bin:/opt/local/bin:/usr/bin:/bin:/usr/sbin:/sbin'
            : isLinux
              ? '/usr/local/bin:/usr/bin:/bin'
              : '';
        const PATH = extraPaths ? `${extraPaths}:${process.env.PATH ?? ''}` : process.env.PATH;

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

// Check whether the current project uses DDEV and the web service is running
const isDdevRunning = async (projectPath: string): Promise<boolean> => {
    const ddevDir = path.join(projectPath, '.ddev');
    if (!fs.existsSync(ddevDir)) return false;
    try {
        // Ensure ddev command is available
        await runCommand(`ddev --version`, projectPath);
        // Query status via JSON
        const desc = await runCommand(`ddev describe -j`, projectPath);
        const data = JSON.parse(desc);
        const raw = (data && data.raw) || undefined;
        const status: string | undefined = raw?.services?.web?.status;
        return status === 'running';
    } catch (_e) {
        return false;
    }
};

const getComposerCandidates = async (projectPath: string): Promise<string[]> => {
    const candidates: string[] = [];

    // 0) If DDEV is running, prefer running composer inside DDEV first
    if (await isDdevRunning(projectPath)) {
        candidates.push('ddev composer');
    }

    // 1) Prefer local composer.phar executed via PHP
    const composerPhar = path.join(projectPath, 'composer.phar');
    if (fs.existsSync(composerPhar)) {
        candidates.push(`php "${composerPhar}"`);
    }

    if (isWindows && !isWSL()) {
        candidates.push('composer.bat'); // Windows
    } else {
        candidates.push('composer'); // Linux/macOS/WSL
    }

    return candidates;
};

const installLaraDumps = async (projectPath: string, logger: Logger) => {
    const artisanPath = path.join(projectPath, 'artisan');
    const errors: string[] = [];

    if (fs.existsSync(artisanPath)) {
        try {
            // 1) Try with DDEV (if .ddev exists and ddev is running)
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

        // 2) Try with Sail (if artisan and sail are present)
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

        // 3) Try with PHP artisan
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

    // 4) Try with LaraDumps binary
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
        // Start signal
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

        // Step: composer requires start
        mainWindow.webContents.send(CHANNELS.COMPOSER_AUTO_INSTALL, { step: 'composer-require', running: true });
        {
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

        // Step: composer requires to be done
        mainWindow.webContents.send(CHANNELS.COMPOSER_AUTO_INSTALL, { step: 'composer-require', done: true });
        logger.info(`Composer require successful.`);

        // Step: remove laradumps.yaml
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

        // Step: remove laradumps.yaml done
        mainWindow.webContents.send(CHANNELS.COMPOSER_AUTO_INSTALL, { step: 'remove-config', done: true });

        // Step: ds:init start
        mainWindow.webContents.send(CHANNELS.COMPOSER_AUTO_INSTALL, { step: 'ds-init', running: true });
        logger.info(`Running ds:init command: artisan ds:init ${selectedDir}`);
        if (fs.existsSync(artisanPath)) {
            await installLaraDumps(selectedDir, logger);
            logger.info(`ds:init command completed successfully.`);
        } else {
            console.log('artisan not found. Running LaraDumps binary initialization.');
            await installLaraDumps(selectedDir, logger);
            logger.info(`LaraDumps binary initialization successful.`);
        }

        // Step: ds:init done
        mainWindow.webContents.send(CHANNELS.COMPOSER_AUTO_INSTALL, { step: 'ds-init', done: true });
        logger.info(`ds:init command completed successfully.`);

        // Finish
        mainWindow.webContents.send(CHANNELS.COMPOSER_AUTO_INSTALL, {
            step: 'finish',
            done: true,
            success: true,
            path: selectedDir,
            message: 'LaraDumps installed successfully.'
        });
        notifyOnce('LaraDumps', 'LaraDumps installed successfully.');

        // Notify that the project directory is ready/selected post install
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
