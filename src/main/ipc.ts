import { dialog, ipcMain, app } from 'electron';
import fs from 'fs/promises';
import path from 'path';

ipcMain.handle('get-mcp-server-path', () => {
    const appPath = app.getAppPath();
    const isPackaged = app.isPackaged;

    if (!isPackaged) {
        return path.resolve(appPath, 'dist', 'mcp-server.js');
    }

    return path.resolve(appPath.replace('app.asar', 'app.asar.unpacked'), 'dist', 'mcp-server.js');
});

ipcMain.handle('save-dialog', async (event, options) => {
    return await dialog.showSaveDialog(options);
});

ipcMain.handle('write-file', async (event, { path, content }) => {
    await fs.writeFile(path, content, 'utf-8');
    return { success: true };
});
