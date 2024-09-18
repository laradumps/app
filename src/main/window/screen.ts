import { app, BrowserWindow, BrowserWindowConstructorOptions, ipcMain } from "electron";
import { join, resolve } from "path";
import { format } from "url";

const isDev = process.env.NODE_ENV === "development";

let screenWindowOptions: BrowserWindowConstructorOptions;

const createScreenWindow = (mainEvent: BrowserWindow, screen: String) => {
    screenWindowOptions = {
        width: 670,
        height: 660,
        show: false,
        resizable: true,
        alwaysOnTop: true,
        titleBarStyle: isMac ? 'hidden' : 'default',
        webPreferences: {
            spellcheck: true,
            nodeIntegration: true,
            preload: resolve(__dirname, "global-ipc-renderer.js"),
            contextIsolation: false
        }
    };

    if ((process.platform === "linux" && !isDev) || isDev) {
        screenWindowOptions.icon = resolve(__dirname, "icon.png");
    }

    const window = new BrowserWindow(screenWindowOptions);

    window.setMenu(null);

    if (isDev) {
        window.loadURL(`http://localhost:4999`);
    } else {
        window.loadURL(
            format({
                pathname: join(__dirname, "app", "index.html"),
                protocol: "file:",
                slashes: true
            })
        );
    }

    window.on("closed", () => {
        mainEvent.webContents.send("screen-window:closed", { screen });

        window.destroy();
    });

    ipcMain.on("screen-window:toggle-always-on-top", (event, arg) => {
        if (!window.isDestroyed()) {
            setTimeout(() => window.setAlwaysOnTop(arg), 200);
        }
    });

    ipcMain.on("screen-window:is-always-on-top", (): void => {
        if (!window.isDestroyed()) {
            window.webContents.send("screen-window:is-always-on-top", { is_always_on_top: window.isAlwaysOnTop() });
        }
    });

    return window;
};

export { createScreenWindow };
