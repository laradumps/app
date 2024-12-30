import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import { CompletedInfo } from "@/types/Updater";
import { download } from "electron-dl";
import { autoUpdater, UpdateFileInfo, UpdateInfo } from "electron-updater";
import fs from "fs";
import { isDev, isMac } from "./main";

let globalUpdateInfo: UpdateInfo;

export const init = async (mainWindow: BrowserWindow) => {
    if (!isDev) {
        autoUpdater.autoDownload = false;

        autoUpdater.on("update-available", async (updateInfo: UpdateInfo): Promise<void> => {
            setTimeout(async (): Promise<void> => {
                if (process.platform === "darwin") {
                    globalUpdateInfo = updateInfo;
                    mainWindow.webContents.send("update-available", updateInfo);
                } else {
                    const result = await dialog.showMessageBox({
                        type: "info",
                        title: "LaraDumps update available!",
                        message: "There are updates available for LaraDumps App. Would you like to update it now?",
                        buttons: ["Yes", "No"]
                    });

                    if (result.response === 0) {
                        mainWindow.webContents.send("update-info", updateInfo);
                        await autoUpdater.downloadUpdate();
                    }
                }
            }, 2000);
        });

        autoUpdater.on("update-downloaded", async (): Promise<void> => {
            mainWindow.show();

            await dialog.showMessageBox(
                new BrowserWindow({
                    show: false,
                    alwaysOnTop: true
                }),
                {
                    title: "Install Updates",
                    message: "Update completed! Restarting the application..."
                }
            );
            setImmediate(() => autoUpdater.quitAndInstall());
        });

        await autoUpdater.checkForUpdates();
    }

    ipcMain.on("main:download-progress-info", async (event, args) => {
        const properties = {
            onProgress: (progress: number) => {
                mainWindow.webContents.send("autoUpdater:download-progress", progress);
            },
            onCompleted: (item: CompletedInfo) => {
                mainWindow.webContents.send("autoUpdater:download-complete", item);
            }
        };

        await download(mainWindow, args, properties);
    });

    ipcMain.on("main:check-upload", async (): Promise<void> => {
        if (!isMac) {
            await autoUpdater.downloadUpdate();
        } else {
            await shell.openExternal("https://github.com/laradumps/app/releases/latest");
        }
    });

    ipcMain.on("main:download-complete", async (event, args) => {
        const result = await dialog.showMessageBox({
            type: "info",
            title: "Update completed!",
            message: "The download was completed successfully!, do you want to install now?",
            buttons: ["Yes", "No"]
        });

        if (result.response === 0) {
            await shell.openPath(args);

            setTimeout(() => app.quit(), 1000);
        }
    });

    ipcMain.on("main:download-update", (): void => {
        setTimeout(async (): Promise<void> => {
            if (isMac) {
                const downloadPath: string = app.getPath("downloads");

                const files: UpdateFileInfo[] = globalUpdateInfo.files;
                const filteredFiles: UpdateFileInfo = files.filter((file: UpdateFileInfo) => file.url.includes("dmg"))[0];
                const fileName: string = filteredFiles.url;

                const downloadedFile = `${downloadPath}/${fileName}`;

                if (fs.existsSync(downloadedFile)) {
                    mainWindow.webContents.send("debug", downloadedFile);

                    await shell.openPath(downloadedFile);

                    app.quit();
                } else {
                    mainWindow.webContents.send("autoUpdater:update-info", globalUpdateInfo);
                }
            } else {
                mainWindow.webContents.send("update-info", globalUpdateInfo);
                await autoUpdater.downloadUpdate();
            }
        }, 3000);
    });
};
