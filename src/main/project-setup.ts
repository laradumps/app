import { BrowserWindow, dialog, IpcMainEvent, Notification } from "electron";
import path from "path";
import fs from "fs";
import { exec } from "child_process";

const isWindows: boolean = process.platform === "win32";

const CHANNELS = {
    COMPOSER_AUTO_INSTALL: "composer-auto-install",
    PROJECT_DIRECTORY_SELECTED: "project-directory-selected"
} as const;

let notifyLock = false;
const notifyOnce = (title: string, body: string) => {
    if (notifyLock) return;
    notifyLock = true;
    new Notification({ title, body }).show();
    setTimeout(() => (notifyLock = false), 1000);
};

const runCommand = (command: string, cwd: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        const isDarwin = process.platform === "darwin";
        const isLinux = process.platform === "linux";
        const extraPaths = isDarwin ? "/opt/homebrew/bin:/usr/local/bin:/opt/local/bin:/usr/bin:/bin:/usr/sbin:/sbin" : isLinux ? "/usr/local/bin:/usr/bin:/bin" : "";
        const PATH = extraPaths ? `${extraPaths}:${process.env.PATH ?? ""}` : process.env.PATH;

        exec(command, { cwd, env: { ...process.env, PATH } }, (error, stdout, stderr) => {
            if (error) {
                console.error(stderr || error.message);
                reject(new Error(stderr || error.message));
                return;
            }
            console.log(stdout);
            resolve();
        });
    });
};

const getComposerCandidates = (projectPath: string): string[] => {
    const candidates: string[] = [];

    // 1) Prefer local composer.phar executed via PHP
    const composerPhar = path.join(projectPath, "composer.phar");
    if (fs.existsSync(composerPhar)) {
        candidates.push(`php "${composerPhar}"`);
    }

    // 2) Fallback to system composer
    candidates.push(isWindows ? "composer.bat" : "composer");
    return candidates;
};

const installLaraDumps = async (projectPath: string) => {
    const artisanPath = path.join(projectPath, "artisan");
    const errors: string[] = [];

    // 1) Try with Sail (if artisan and sail are present)
    if (fs.existsSync(artisanPath)) {
        const sailPath = path.join(projectPath, "vendor", "bin", isWindows ? "sail.bat" : "sail");
        if (fs.existsSync(sailPath)) {
            try {
                console.log(`Using Sail to run artisan commands.`, sailPath);
                await runCommand(`${sailPath} artisan ds:init "${projectPath}"`, projectPath);
                return;
            } catch (e) {
                const msg = (e as Error)?.message || String(e);
                console.warn(`Sail failed, will try PHP.`, msg);
                errors.push(`Sail: ${msg}`);
            }
        }

        // 2) Try with PHP artisan
        try {
            console.log(`Using PHP to run artisan commands.`, artisanPath);
            await runCommand(`php artisan ds:init "${projectPath}"`, projectPath);
            return;
        } catch (e) {
            const msg = (e as Error)?.message || String(e);
            console.warn(`PHP artisan failed, will try LaraDumps binary.`, msg);
            errors.push(`PHP: ${msg}`);
        }
    }

    // 3) Try with LaraDumps binary
    const bin = isWindows ? path.join(projectPath, "vendor", "bin", "laradumps.bat") : path.join(projectPath, "vendor", "bin", "laradumps");

    console.log(`Using binary commands.`, bin);

    if (!fs.existsSync(bin)) {
        throw new Error("LaraDumps binary not found. Did you run composer require?");
    }

    try {
        await runCommand(`${bin} init`, projectPath);
        return;
    } catch (e) {
        const msg = (e as Error)?.message || String(e);
        errors.push(`Binary: ${msg}`);
        throw new Error(`Failed to initialize via Sail, PHP, and binary. Details: ${errors.join(" | ")}`);
    }
};

const composerAutoInstall = async (mainWindow: BrowserWindow, selectedDir: string): Promise<void> => {
    try {
        const composerJsonPath = path.join(selectedDir, "composer.json");

        // Start signal
        mainWindow.webContents.send(CHANNELS.COMPOSER_AUTO_INSTALL, { status: "start", path: selectedDir });

        if (!fs.existsSync(composerJsonPath)) {
            mainWindow.webContents.send(CHANNELS.COMPOSER_AUTO_INSTALL, {
                error: "composer.json not found in the selected directory. Please select a Composer project root."
            });
            notifyOnce("LaraDumps", "composer.json not found in the selected directory.");
            return;
        }

        // Step: composer require start
        mainWindow.webContents.send(CHANNELS.COMPOSER_AUTO_INSTALL, { step: "composer-require", running: true });
        {
            const errors: string[] = [];
            const candidates = getComposerCandidates(selectedDir);
            let success = false;
            for (const cmd of candidates) {
                try {
                    await runCommand(`${cmd} require laradumps/laradumps laradumps/laradumps-core --dev`, selectedDir);
                    success = true;
                    break;
                } catch (e) {
                    const msg = (e as Error)?.message || String(e);
                    console.warn(`composer require failed with: ${cmd}`, msg);
                    errors.push(`${cmd}: ${msg}`);
                }
            }
            if (!success) {
                throw new Error(
                    `composer require failed via all strategies. Details: ${errors.join(" | ")}. ` + `Tip: Install Composer (https://getcomposer.org/) or ensure PHP can run a local composer.phar.`
                );
            }
        }

        // Step: composer require done
        mainWindow.webContents.send(CHANNELS.COMPOSER_AUTO_INSTALL, { step: "composer-require", done: true });

        // Step: remove laradumps.yaml
        mainWindow.webContents.send(CHANNELS.COMPOSER_AUTO_INSTALL, { step: "remove-config", running: true });
        {
            const configPath = path.join(selectedDir, "laradumps.yaml");
            if (fs.existsSync(configPath)) {
                fs.unlinkSync(configPath);
                console.log("Removed existing laradumps.yaml");
            } else {
                console.log("No existing laradumps.yaml to remove");
            }
        }

        // Step: remove laradumps.yaml done
        mainWindow.webContents.send(CHANNELS.COMPOSER_AUTO_INSTALL, { step: "remove-config", done: true });

        // Step: ds:init start
        mainWindow.webContents.send(CHANNELS.COMPOSER_AUTO_INSTALL, { step: "ds-init", running: true });
        await installLaraDumps(selectedDir);

        // Step: ds:init done
        mainWindow.webContents.send(CHANNELS.COMPOSER_AUTO_INSTALL, { step: "ds-init", done: true });

        // Finish
        mainWindow.webContents.send(CHANNELS.COMPOSER_AUTO_INSTALL, {
            step: "finish",
            done: true,
            success: true,
            path: selectedDir,
            message: "LaraDumps installed successfully."
        });
        notifyOnce("LaraDumps", "LaraDumps installed successfully.");

        // Notify that project directory is ready/selected post install
        mainWindow.webContents.send(CHANNELS.PROJECT_DIRECTORY_SELECTED, selectedDir);
    } catch (error) {
        console.log(error);
        const message = "Failed to install LaraDumps. " + (error as Error).message;
        mainWindow.webContents.send(CHANNELS.COMPOSER_AUTO_INSTALL, {
            error: message
        });
        notifyOnce("LaraDumps", message);
    }
};

const selectProjectDirectory = async (mainWindow: BrowserWindow, _event: IpcMainEvent, _args?: unknown): Promise<void> => {
    try {
        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ["openDirectory"]
        });

        if (result.canceled || result.filePaths.length === 0) {
            mainWindow.webContents.send(CHANNELS.COMPOSER_AUTO_INSTALL, {
                error: "Operation cancelled by user."
            });
            notifyOnce("LaraDumps", "Operation cancelled by user.");
            return;
        }

        const selectedDir = result.filePaths[0];

        await composerAutoInstall(mainWindow, selectedDir);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(err);
        mainWindow.webContents.send(CHANNELS.COMPOSER_AUTO_INSTALL, { error: errorMessage });
        notifyOnce("LaraDumps", errorMessage);
    }
};

export { selectProjectDirectory, composerAutoInstall };
