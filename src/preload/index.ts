import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
    invoke: (channel: string, data?: any) => {
        const validChannels = ['save-dialog', 'write-file'];
        if (validChannels.includes(channel)) {
            return ipcRenderer.invoke(channel, data);
        }
        throw new Error(`Channel ${channel} is not allowed`);
    }
});
