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
        exec(command, { cwd }, (error, stdout, stderr) => {
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

const getComposerCommand = (): string => {
    const sailPath = path.join(process.cwd(), "vendor", "bin", isWindows ? "sail.bat" : "sail");

    if (fs.existsSync(sailPath)) {
        return isWindows ? `${sailPath} composer` : `${sailPath} composer`;
    }

    return isWindows ? "composer.bat" : "composer";
};

const installLaraDumps = async (projectPath: string) => {
    const artisanPath = path.join(projectPath, "artisan");
    const errors: string[] = [];

    // 1) Try with Sail (if artisan and sail are present)
    if (fs.existsSync(artisanPath)) {
        const sailPath = path.join(projectPath, "vendor", "bin", "sail");
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
    const bin = isWindows
        ? path.join(projectPath, "vendor", "bin", "laradumps.bat")
        : path.join(projectPath, "vendor", "bin", "laradumps");

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
        const composer = getComposerCommand();

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
        await runCommand(`${composer} require laradumps/laradumps laradumps/laradumps-core --dev`, selectedDir);

        // Step: composer require done
        mainWindow.webContents.send(CHANNELS.COMPOSER_AUTO_INSTALL, { step: "composer-require", done: true });

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
            message: "LaraDumps installed and initialized."
        });
        notifyOnce("LaraDumps", "LaraDumps installed and initialized.");

        // Notify that project directory is ready/selected post install
        mainWindow.webContents.send(CHANNELS.PROJECT_DIRECTORY_SELECTED, selectedDir);
    } catch (error) {
        console.log(error);
        const message = "Failed to install/initialize LaraDumps. " + (error as Error).message;
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
