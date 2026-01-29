export {};

declare global {
    interface Window {
        Sfdump: any;
        ipcRenderer: Electron.IpcRenderer;
        LaraDumps: any;
        webFrame: any;
        shell: any;
    }
}
