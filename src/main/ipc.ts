import { ipcMain, app } from 'electron';
import path from 'path';

ipcMain.handle('get-mcp-server-path', () => {
    const appPath = app.getAppPath();
    const isPackaged = app.isPackaged;

    if (!isPackaged) {
        return path.resolve(appPath, 'dist', 'mcp-server.js');
    }

    return path.resolve(appPath.replace('app.asar', 'app.asar.unpacked'), 'dist', 'mcp-server.js');
});
