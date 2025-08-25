import { BrowserWindow, dialog, ipcMain, IpcMainEvent } from "electron";
import path from "path";
import fs from "fs";
import { exec } from "child_process";

const isWindows: boolean = process.platform === "win32";

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
    return isWindows ? "composer.bat" : "composer";
};

const initLaraDumps = async (projectPath: string) => {
    const artisanPath = path.join(projectPath, "artisan");

    if (fs.existsSync(artisanPath)) {
        await runCommand(`php artisan ds:init "${path.join(projectPath, "laradumps.yaml")}"`, projectPath);
    } else {
        const laradumpsBin = isWindows ? path.join(projectPath, "vendor", "bin", "laradumps.bat") : path.join(projectPath, "vendor", "bin", "laradumps");

        if (!fs.existsSync(laradumpsBin)) {
            throw new Error("LaraDumps binary not found. Did you run composer require?");
        }

        await runCommand(`${laradumpsBin} init "${projectPath}"`, projectPath);
    }
};

const chooseDirectory = async (mainWindow: BrowserWindow, event: IpcMainEvent, _args?: unknown): Promise<void> => {
    try {
        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ["openDirectory"]
        });

        if (result.canceled || result.filePaths.length === 0) {
            mainWindow.webContents.send("choose-directory", {
                error: "Operation cancelled by user."
            });
            return;
        }

        const selectedDir = result.filePaths[0];
        const configFilePath = path.join(selectedDir, "laradumps.yaml");

        if (!fs.existsSync(configFilePath)) {
            try {
                const composer = getComposerCommand();

                await runCommand(`${composer} require laradumps/laradumps laradumps/laradumps-core --dev`, selectedDir);

                await initLaraDumps(selectedDir);

                mainWindow.webContents.send("choose-directory", {
                    success: true,
                    path: selectedDir,
                    message: "LaraDumps installed and initialized."
                });
            } catch (error) {
                console.log(error);
                mainWindow.webContents.send("choose-directory", {
                    error: "Failed to install/initialize LaraDumps. " + (error as Error).message
                });
            }
        } else {
            // choose-directory-reply
            mainWindow.webContents.send('choose-directory-reply', selectedDir)

            console.log('Configuration file already exists.');
        }
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(err);
        mainWindow.webContents.send("choose-directory", { error: errorMessage });
    }
};

export { chooseDirectory };
