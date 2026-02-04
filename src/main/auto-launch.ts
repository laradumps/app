import { ipcMain } from 'electron';

const AutoLaunch = require('auto-launch');

const isDev: boolean = process.env.NODE_ENV === 'development';

export const init = async () => {
    if (isDev) {
        return;
    }

    const autoLauncher = new AutoLaunch({ name: 'LaraDumps' });

    ipcMain.on('set-auto-launch', (event: Electron.IpcMainEvent, arg): void => {
        arg.value === 'disabled' ? autoLauncher.disable() : autoLauncher.enable();
    });
};
