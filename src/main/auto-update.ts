import { autoUpdater, UpdateInfo } from 'electron-updater';
import { BrowserWindow, ipcMain, app, shell } from 'electron';
import { download } from 'electron-dl';
import fs from 'fs';

let globalUpdateInfo: UpdateInfo;
let mainWindow: BrowserWindow;

export const init = async (window: BrowserWindow) => {
    mainWindow = window;

    if (process.platform === 'darwin') {
        process.env.ELECTRON_BUILDER_ALLOW_UNRESOLVED_DEPENDENCIES = 'true';
    }

    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = false;

    autoUpdater.on('checking-for-update', () => {
        console.log('[AutoUpdater] Checking for updates...');
    });

    autoUpdater.on('update-available', async (updateInfo: UpdateInfo): Promise<void> => {
        console.log('[AutoUpdater] Update available:', updateInfo.version);
        globalUpdateInfo = updateInfo;
        window.webContents.send('autoUpdater:update-available', updateInfo);
    });

    autoUpdater.on('update-not-available', () => {
        console.log('[AutoUpdater] No updates available');
    });

    autoUpdater.on('error', (err) => {
        console.error('[AutoUpdater] Error:', err.message);
        window.webContents.send('autoUpdater:error', err.message);
    });

    autoUpdater.on('download-progress', (progress) => {
        console.log('[AutoUpdater] Download progress:', progress.percent);
        window.webContents.send('autoUpdater:download-progress', progress);
    });

    autoUpdater.on('update-downloaded', async (info: UpdateInfo): Promise<void> => {
        console.log('[AutoUpdater] Update downloaded');
        window.webContents.send('autoUpdater:update-downloaded', info);
    });

    ipcMain.on('main:download-update', async (): Promise<void> => {
        console.log('[AutoUpdater] User requested download');

        if (process.platform === 'darwin') {
            await downloadUpdateMacOS();
        } else {
            await autoUpdater.downloadUpdate();
        }
    });

    ipcMain.on('main:install-update', async (): Promise<void> => {
        console.log('[AutoUpdater] User requested install');

        if (process.platform === 'darwin') {
            const downloadPath = app.getPath('downloads');
            const files = globalUpdateInfo.files;
            const dmgFile = files.find((file) => file.url.includes('.dmg'));

            if (dmgFile) {
                const dmgPath = `${downloadPath}/${dmgFile.url}`;
                if (fs.existsSync(dmgPath)) {
                    await shell.openPath(dmgPath);
                    setTimeout(() => app.quit(), 1000);
                }
            }
        } else {
            setImmediate(() => autoUpdater.quitAndInstall());
        }
    });
};

const downloadUpdateMacOS = async (): Promise<void> => {
    if (!globalUpdateInfo) return;

    const baseURL = 'https://github.com/laradumps/app/releases/download/';
    const tag = (globalUpdateInfo as any).tag;
    const files = globalUpdateInfo.files || [];

    const dmgFile = files.find((file) => file.url.includes('.dmg'));
    if (!dmgFile) {
        console.error('[AutoUpdater] No DMG file found');
        mainWindow.webContents.send('autoUpdater:error', 'No DMG file found');
        return;
    }

    const downloadURL = `${baseURL}${tag}/${dmgFile.url}`;
    console.log('[AutoUpdater] Downloading from:', downloadURL);

    try {
        await download(mainWindow, downloadURL, {
            onProgress: (progress: number) => {
                mainWindow.webContents.send('autoUpdater:download-progress', { percent: progress * 100 });
            },
            onCompleted: () => {
                console.log('[AutoUpdater] Download completed');
                mainWindow.webContents.send('autoUpdater:update-downloaded', globalUpdateInfo);
            }
        });
    } catch (error) {
        console.error('[AutoUpdater] Download error:', error);
        mainWindow.webContents.send('autoUpdater:error', error.message);
    }
};
