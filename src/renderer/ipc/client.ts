import type { IpcRendererEvent } from 'electron';
import type { IpcReceiveChannel } from '@/types/ipc';

type IpcListener = (event: IpcRendererEvent, ...args: any[]) => void;

export const ipc = {
    on(channel: IpcReceiveChannel, listener: IpcListener): void {
        window.ipcRenderer.on(channel, listener);
    },
    off(channel: IpcReceiveChannel, listener: IpcListener): void {
        window.ipcRenderer.off(channel, listener);
    },
    once(channel: string, listener: IpcListener): void {
        window.ipcRenderer.once(channel, listener);
    },
    send(channel: string, ...args: any[]): void {
        window.ipcRenderer.send(channel, ...args);
    },
    invoke(channel: string, ...args: any[]): Promise<any> {
        return window.ipcRenderer.invoke(channel, ...args);
    }
};
