import { app, BrowserWindow, BrowserWindowConstructorOptions, ipcMain } from "electron";
import path, { join, resolve } from "path";
import { format } from "url";
import storage from "electron-json-storage";
import os from "os";

const isDev = process.env.NODE_ENV === "development";

let savedDumps: any;
let savedDumpsWindowOptions: BrowserWindowConstructorOptions;

const createWindow = () => {
    savedDumpsWindowOptions = {
        width: 670,
        height: 660,
        show: false,
        resizable: false,
        alwaysOnTop: true,
        webPreferences: {
            spellcheck: true,
            nodeIntegration: true,
            preload: resolve(__dirname, "global-ipc-renderer.js"),
            contextIsolation: false
        }
    };

    if ((process.platform === "linux" && !isDev) || isDev) {
        savedDumpsWindowOptions.icon = resolve(__dirname, "icon.png");
    }

    const savedDumpsWindow = new BrowserWindow(savedDumpsWindowOptions);
    savedDumpsWindow.setMenu(null);

    if (isDev) {
        savedDumpsWindow.loadURL(`http://localhost:4999`);
    } else {
        savedDumpsWindow.loadURL(
            format({
                pathname: join(__dirname, "app", "index.html"),
                protocol: "file:",
                slashes: true
            })
        );
    }

    return savedDumpsWindow;
};

const initSavedDumps = () => {
    return (savedDumps = createWindow());
};

ipcMain.on("saved-dumps:show", (event: Electron.IpcMainEvent, arg: any) => {
    savedDumps.show();
    savedDumps.webContents.send("app:load-all-saved-dumps", {
        assets: path.join(app.getAppPath(), "src/assets")
    });
    savedDumps.setAlwaysOnTop(true);
});

ipcMain.on("saved-dumps:load", () => {
    storage.setDataPath(os.tmpdir());
    let data;

    storage.keys(async (error, keys: string[]) => {
        if (error) throw error;
        for (const key of keys) {
            data = await storage.getSync(key);
            if (!["zoomLevel"].includes(key)) {
                savedDumps.webContents.send("app:render-all-saved-dumps", data);
            }
        }
    });
});

ipcMain.on("saved-dumps:remove", (event, arg) => {
    storage.setDataPath(os.tmpdir());
    storage.remove(arg, (error) => {
        if (error) throw error;
    });
});

ipcMain.on("main:save-dumps", (event, arg) => {
    const payloadId = JSON.parse(arg).id;

    storage.setDataPath(os.tmpdir());
    storage.set(payloadId, arg, (error) => {
        if (error) throw error;
    });
});

export { createWindow, initSavedDumps };
