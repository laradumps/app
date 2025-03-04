import { BrowserWindow, ipcMain } from "electron";
import { resolve } from "path";

export const init = async () => {
    ipcMain.on("main:open-custom-window", (event, link) => {
        const window: BrowserWindow = new BrowserWindow({
            show: true,
            width: 830,
            height: 690,
            resizable: true,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
                preload: resolve(__dirname, "preload.cjs"),
                experimentalFeatures: true,
            },
            alwaysOnTop: true,
            title: link.title
        });

        window.loadURL(link.url);

        window.webContents.on("did-finish-load", () => {
            window.webContents.executeJavaScript(`
            document.addEventListener('click', function(event) {
                var target = event.target;
                while (target && target.tagName !== 'A') {
                    target = target.parentNode;
                }
                if (target && target.tagName === 'A' && target.href && !target.href.startsWith('file://')) {
                    event.preventDefault();
                    window.shell.openExternal(target.href);
                }
            });

            window.addEventListener('contextmenu', (e) => {
              e.preventDefault()
              window.ipcRenderer.send('mail-preview::show-context-menu')
            })
        `);
        });
    });
};
