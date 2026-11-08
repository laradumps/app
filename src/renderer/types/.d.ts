export {};

declare global {
    interface Window {
        Sfdump: any;
        ipcRenderer: Electron.IpcRenderer;
    }
}
