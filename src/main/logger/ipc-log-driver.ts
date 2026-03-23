import { BrowserWindow } from 'electron';
import { LogDriver, LogEntry } from './logger';

export class IpcLogDriver implements LogDriver {
    constructor(
        private mainWindow: BrowserWindow,
        private channel: string,
        private extraPayload: Record<string, any> = {}
    ) {}

    log(entry: LogEntry): void {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send(this.channel, {
                ...this.extraPayload,
                message: entry.message,
                level: entry.level,
                timestamp: entry.timestamp
            });
        }
    }
}
