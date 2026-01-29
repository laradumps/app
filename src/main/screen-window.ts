import { BrowserWindow, ipcMain } from 'electron';
import { Payload } from '@/types/Payload';

export const init = async (mainWindow: BrowserWindow, windowsMap) => {
    function sendScreenWindowUpdate(screen: string, payload: Payload, jobs: any, mails: any, logs: any) {
        const screenWindow = windowsMap.get(screen);
        try {
            if (screenWindow && !screenWindow.isDestroyed() && screenWindow.webContents) {
                screenWindow.webContents.send('app:screen-window-update', {
                    payload,
                    jobs,
                    mails,
                    logs
                });
            }
        } catch (e) {}
    }

    ipcMain.on('send-screen-window-update', (event, args) => {
        const payload = args.payload;
        const jobs = args.jobs;
        const mails = args.mails;
        const logs = args.logs;

        sendScreenWindowUpdate(args.screen, payload, jobs, mails, logs);
    });
};
