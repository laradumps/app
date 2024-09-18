import { BrowserWindow, ipcMain, BrowserWindowConstructorOptions } from "electron";
import { join, resolve } from "path";
import { format } from "url";
import os from "os";
import storage from "electron-json-storage";

const isDev: boolean = process.env.NODE_ENV === "development";

let coffeeWindow: Electron.CrossProcessExports.BrowserWindow;

function createWindow(): BrowserWindow {
    const coffeeWindowOptions: BrowserWindowConstructorOptions = {
        width: 700,
        height: 500,
        center: true,
        resizable: false,
        titleBarStyle: 'hidden',
        frame: false,
        transparent: false,
        alwaysOnTop: true,
        show: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    };

    if ((process.platform === "linux" && !isDev) || isDev) {
        coffeeWindowOptions.icon = resolve(__dirname, "icon.png");
    }

    const coffeeWindow: BrowserWindow = new BrowserWindow(coffeeWindowOptions);

    coffeeWindow.setMenu(null);

    if (isDev) {
        coffeeWindow.loadURL("http://localhost:4999/coffee.html");
        coffeeWindow.webContents.openDevTools();
    } else {
        coffeeWindow.loadURL(
            format({
                pathname: join(__dirname, "app", "coffee.html"),
                protocol: "file:",
                slashes: true
            })
        );
    }

    return coffeeWindow;
}

const initCoffeeWindow = () => {
    return (coffeeWindow = createWindow());
};

ipcMain.on("coffee:grab-a-coffee", (event: Electron.IpcMainEvent, arg): void => {
    coffeeWindow.webContents.send("coffee:show-coffee-quote", arg);

    storage.keys((error, keys: string[]): void => {
        if (error) throw error;

        keys.forEach((key: string): void => {
            if (key.startsWith("count_")) {
                storage.get(key, (error, data: Object): void => {
                    const stats = {};
                    // @ts-ignore
                    stats[key] = data.total;
                    coffeeWindow.webContents.send("coffee:show-stats", stats);
                });
            }
        });
    });

    coffeeWindow.show();

    setTimeout(async (): Promise<void> => coffeeWindow.hide(), 8000);
});

ipcMain.on("coffee:increment-counter", (event: Electron.IpcMainEvent, type: String): void => {
    const countTypes: any = {
        // type, countAs
        diff: "ds",
        dump: "ds",
        model: "ds",
        table: "ds",
        "time-track": "ds",
        events: "livewire",
        livewire: "livewire",
        log: "log",
        queries: "sql"
    };

    // @ts-ignore
    let countAs = countTypes[type];

    if (countAs) {
        countAs = `count_${countAs}`;

        const hasKey: void = storage.has(countAs, (error, hasKey: boolean) => hasKey);

        // @ts-ignore
        if (hasKey === false) {
            // @ts-ignore
            storage.set(countAs, { total: 1 });
            return;
        }

        // @ts-ignore
        storage.get(countAs, (error, data) =>
            // @ts-ignore
            storage.set(countAs, { total: data.total + 1 })
        );
    }
});

ipcMain.on("main:grab-a-coffee", (event: Electron.IpcMainEvent, arg): void => {
    coffeeWindow.webContents.send("coffee:show-coffee-quote", arg);

    storage.keys((error, keys): void => {
        if (error) throw error;

        keys.forEach((key: string): void => {
            if (key.startsWith("count_")) {
                storage.get(key, (error, data: Object): void => {
                    const stats = {};
                    // @ts-ignore
                    stats[key] = data.total;
                    coffeeWindow.webContents.send("coffee:show-stats", stats);
                });
            }
        });
    });

    coffeeWindow.show();

    setTimeout(async (): Promise<void> => coffeeWindow.hide(), 8000);
});

export { initCoffeeWindow };
