import { app, nativeTheme, BrowserWindow, Menu, BrowserWindowConstructorOptions, dialog, ipcMain, shell } from "electron";
import windowStateKeeper from "electron-window-state";
import path, { join, resolve } from "path";
import * as url from "url";
import fs from "fs";

import storage from "electron-json-storage";

import { initSavedDumps } from "./window/saved-dumps";
import { initCoffeeWindow } from "./window/coffee";

import { configureLocalShortcut, registerShortcuts } from "./shortcut";

import { createMenu } from "./main-menu";
import "./watcher";

import { chooseDirectory } from "./choose-directory";

import * as xdebug from "./xdebug";
import * as customWindow from "./custom-window";
import * as autoUpdate from "./auto-update";
import * as storageManager from "./storage";
import * as macosTray from "./macos-tray";
import * as autoLauncher from "./auto-launcher";
import * as screenWindow from "./screen-window";

export const isDev: boolean = process.env.NODE_ENV === "development";
export const isMac: boolean = process.platform === "darwin";

let mainWindow: BrowserWindow;
let savedDumpWindow: BrowserWindow;

const windowsMap = new Map();

const electronLocalShortcut = require("electron-localshortcut");

function createWindow(): BrowserWindow {
    const winState: windowStateKeeper.State = windowStateKeeper({
        defaultWidth: 670,
        defaultHeight: 660
    });

    const browserWindowOptions: BrowserWindowConstructorOptions = {
        fullscreen: false,
        fullscreenable: false,
        width: isDev ? 1080 : 690,
        height: 640,
        resizable: true,
        alwaysOnTop: false,
        center: true,
        webPreferences: {
            contextIsolation: false,
            preload: resolve(__dirname, "preload.js"),
            nodeIntegration: true
        },
        show: true,
        icon: path.join(__dirname, "icon.png")
    };

    if (process.platform === "linux" && !isDev) {
        browserWindowOptions.icon = resolve(__dirname, "icon.png");
    }

    if (isMac) {
        browserWindowOptions.titleBarStyle = "hiddenInset";
        browserWindowOptions.trafficLightPosition = { x: 12, y: 11 };
    }

    const win: BrowserWindow = new BrowserWindow(browserWindowOptions);

    winState.manage(win);

    if (isDev) {
        win.loadURL(`http://localhost:4999`);
    }

    if (!isDev) {
        win.loadURL(
            url.format({
                pathname: join(__dirname, "app", "index.html"),
                protocol: "file:",
                slashes: true
            })
        );
    }

    electronLocalShortcut.register("CommandOrControl+Shift+X", (): void => {
        mainWindow.webContents.send("xdebug-connector::disconnect");

        setTimeout(() => mainWindow.reload(), 300);
    });

    win.once("ready-to-show", (): void => {
        win.show();
        win.focus();

        mainWindow.webContents.send("assetsPath", path.join(app.getAppPath(), "src/assets"));

        if (isDev) {
            win.webContents.openDevTools();
        }
    });

    win.webContents.on("did-finish-load", () => {
        // const breakpoints = getBreakpoints();
        // console.log(breakpoints)
    });

    return win;
}

ipcMain.on("dump", (event: Electron.IpcMainEvent, arg): void => {
    if (!Object.prototype.hasOwnProperty.call(arg.content, "meta")) {
        return;
    }

    event.sender.send(arg.type, arg);
});

app.whenReady().then(async (): Promise<void> => {
    mainWindow = createWindow();
    initCoffeeWindow();
    savedDumpWindow = initSavedDumps();

    await createMenu(mainWindow, windowsMap);

    mainWindow.on("minimize", (event: Event): void => {
        event.preventDefault();
        if (isMac) {
            mainWindow.hide();
        }
    });

    mainWindow.on("restore", () => {
        mainWindow.show();
    });

    // @ts-ignore
    mainWindow.on("close", function (): void {
        mainWindow.webContents.send("server:close", {});
    });

    mainWindow.on("closed", (): void => {
        app.exit(0);
    });

    // @ts-ignore
    savedDumpWindow.on("close", (event: Event): void => {
        event.preventDefault();
        savedDumpWindow.hide();
    });

    configureLocalShortcut(mainWindow);

    const userDataPath = app.getPath("userData");

    storage.setDataPath(path.join(userDataPath, "storage"));

    await screenWindow.init(mainWindow, windowsMap);
    await xdebug.init(mainWindow);
    await customWindow.init();
    await autoUpdate.init(mainWindow);
    await storageManager.init(mainWindow);
    await macosTray.init(mainWindow);
    await autoLauncher.init(mainWindow);
});

app.on("window-all-closed", (): void => {
    app.quit();
});

app.on("activate", (): void => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

app.on("browser-window-focus", (): void => {
    registerShortcuts(mainWindow);
});

ipcMain.on("main:get-ide-handler", (): void => {
    const jsonFilePath = path.join(app.getAppPath(), "./src/renderer/ide-handle-support.json");

    fs.readFile(jsonFilePath, "utf8", (err, data) => {
        if (err) {
            // eslint-disable-next-line no-console
            console.error("An error occurred while reading the JSON file:", err);
            return;
        }

        const parsedData = JSON.parse(data);

        mainWindow.webContents.send("app:ide-handler", parsedData);
    });
});

ipcMain.on("mail-preview::show-context-menu", (event) => {
    const template = [
        {
            label: "Inspect",
            click: () => {
                const win = BrowserWindow.fromWebContents(event.sender);
                if (win) {
                    win.webContents.openDevTools();
                }
            }
        }
    ];
    const menu = Menu.buildFromTemplate(template);
    menu.popup({ window: BrowserWindow.fromWebContents(event.sender) });
});

ipcMain.on("main:create-static-tmp-file", (event, value) => {
    mainWindow.webContents.send("preload:create-static-tmp-file", value);
});

ipcMain.on("main:update-zoom-level", (event, value): void => {
    // @ts-ignore
    storage.set("zoomLevel", { value: value });
});

ipcMain.on("main:os-temp-dir", (): void => {
    let zoomFactor = 1.0;

    const storageZoomValue = () => storage.getSync("zoomLevel");

    // @ts-ignore
    if (storageZoomValue().value > 0) {
        // @ts-ignore
        zoomFactor = storageZoomValue().value;
    }

    mainWindow.webContents.send("app:os-temp-dir", zoomFactor);
});

ipcMain.on("main:openLink", (event: Electron.IpcMainEvent, url: any): void => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    shell.openExternal(url).then((): void => {});
});

ipcMain.on("main:toggle-always-on-top", (event, arg) => {
    setTimeout(() => mainWindow.setAlwaysOnTop(arg), 200);
});

ipcMain.on("main:is-always-on-top", (): void => {
    mainWindow.webContents.send("main:is-always-on-top", { is_always_on_top: mainWindow.isAlwaysOnTop() });
});

ipcMain.on("main:get-app-version", (): void => {
    mainWindow.webContents.send("main:app-version", { version: app.getVersion() });
    mainWindow.webContents.send("assetsPath", path.join(app.getAppPath(), "src/assets"));
});

ipcMain.on("main:show", (): void => {
    mainWindow.show();
});

ipcMain.on("main:dialog", async (event, arg): void => {
    const choice = dialog.showMessageBoxSync(mainWindow, {
        type: "question",
        buttons: arg.buttons,
        title: arg.title,
        message: arg.message
    });

    mainWindow.webContents.send("main:dialog-choice", choice);
});

ipcMain.on("native-theme", () => {
    mainWindow.webContents.send(nativeTheme.shouldUseDarkColors ? "app:theme-dark" : "app:theme-light");
});

nativeTheme.on("updated", () => {
    mainWindow.webContents.send(nativeTheme.shouldUseDarkColors ? "app:theme-dark" : "app:theme-light");
});

ipcMain.on("main:pause-dumps", (event, args) => {
    mainWindow.webContents.send("app:pause-dumps", args);
});

ipcMain.on("main:choose-directory", async (event, args) => {
    await chooseDirectory(mainWindow, event, args);
});
