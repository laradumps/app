import { autoUpdater, UpdateFileInfo, UpdateInfo } from 'electron-updater';
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import fs from 'fs';

let globalUpdateInfo: UpdateInfo;

export const init = async (window: BrowserWindow) => {
    ipcMain.on('main:download-update', (): void => {
        handleDownloadUpdate(window);
    });
    autoUpdater.autoDownload = false;
    autoUpdater.on('update-available', async (updateInfo: UpdateInfo): Promise<void> => {
        handleUpdateAvailable(window, updateInfo);
    });
    autoUpdater.on('update-downloaded', async (): Promise<void> => {
        await handleUpdateDownloaded(window);
    });
};

const handleDownloadUpdate = (window: any) => {
    setTimeout(async (): Promise<void> => {
        if (process.platform === 'darwin') {
            const downloadPath: string = app.getPath('downloads');

            const files: UpdateFileInfo[] = globalUpdateInfo.files;
            const filteredFiles: UpdateFileInfo = files.filter((file: UpdateFileInfo) => file.url.includes('dmg'))[0];
            const fileName: string = filteredFiles.url;

            const downloadedFile = `${downloadPath}/${fileName}`;

            if (fs.existsSync(downloadedFile)) {
                await shell.openPath(downloadedFile);

                app.quit();
            } else {
                window.webContents.send('autoUpdater:update-info', globalUpdateInfo);
            }
        } else {
            window.webContents.send('update-info', globalUpdateInfo);
            await autoUpdater.downloadUpdate();
        }
    }, 3000);
};

const handleUpdateAvailable = (window: any, updateInfo: UpdateInfo) => {
    setTimeout(async (): Promise<void> => {
        if (process.platform === 'darwin') {
            globalUpdateInfo = updateInfo;
            window.webContents.send('update-available', updateInfo);
        } else {
            const result = await dialog.showMessageBox({
                type: 'info',
                title: 'LaraDumps update available!',
                message: 'There are updates available for LaraDumps App. Would you like to update it now?',
                buttons: ['Yes', 'No']
            });

            if (result.response === 0) {
                window.webContents.send('update-info', updateInfo);
                await autoUpdater.downloadUpdate();
            }
        }
    }, 2000);
};

const handleUpdateDownloaded = async (window: any) => {
    window.show();

    await dialog.showMessageBox(
        new BrowserWindow({
            show: false,
            alwaysOnTop: true
        }),
        {
            title: 'Install Updates',
            message: 'Update completed! Restarting the application...'
        }
    );
    setImmediate(() => autoUpdater.quitAndInstall());
};
