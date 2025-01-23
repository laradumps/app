import { app, nativeTheme, BrowserWindow, Menu, BrowserWindowConstructorOptions, dialog, ipcMain, shell } from "electron";
import windowStateKeeper from "electron-window-state";
import { autoUpdater } from "electron-updater";
import { download } from "electron-dl";

import path, { join, resolve } from "path";
import * as url from "url";
import fs from "fs";
import * as ssh from "./ssh";

import storage from "electron-json-storage";

import * as electronStore from "./storage";
import * as electronAutoUpdate from "./auto-update";
import * as electronTray from "./tray";
import * as customWindow from "./custom-window";
import * as electronAutoLaunch from "./auto-launch";

import { initSavedDumps } from "./window/saved-dumps";

import { configureLocalShortcut, registerShortcuts } from "./shortcut";

import { CompletedInfo } from "@/types/Updater";
import { createMenu } from "./main-menu";
import { createScreenWindow } from "./window/screen";

const isDev: boolean = process.env.NODE_ENV === "development";
const isMac: boolean = process.platform === "darwin";

let mainWindow: BrowserWindow;
let savedDumpWindow: BrowserWindow;

const windowsMap = new Map();

const electronLocalShortcut = require("electron-localshortcut");

function createWindow(): BrowserWindow {
    const winState: windowStateKeeper.State = windowStateKeeper({
        defaultWidth: 680,
        defaultHeight: 620
    });

    const browserWindowOptions: BrowserWindowConstructorOptions = {
        fullscreen: false,
        fullscreenable: false,
        width: 730,
        height: 620,
        resizable: true,
        alwaysOnTop: false,
        center: true,
        titleBarStyle: "hiddenInset",
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
        browserWindowOptions.trafficLightPosition = { x: 12, y: 11 };
    }

    const window: BrowserWindow = new BrowserWindow(browserWindowOptions);

    window.setMenuBarVisibility(false);

    winState.manage(window);

    window.loadURL(
        isDev
            ? `http://localhost:4999`
            : url.format({
                  pathname: join(__dirname, "app", "index.html"),
                  protocol: "file:",
                  slashes: true
              })
    );

    !isDev && electronAutoUpdate.init(window);

    electronLocalShortcut.register("CommandOrControl+Shift+X", (): void => {
        mainWindow.reload();
    });

    window.once("ready-to-show", (): void => {
        window.show();
        window.focus();

        if (isDev) {
            window.webContents.openDevTools();
        }
    });

    return window;
}

ipcMain.on("dump", (event: Electron.IpcMainEvent, arg): void => {
    event.sender.send(arg.type, arg);
});

function sendScreenWindowUpdate(screen, payload) {
    const screenWindow = windowsMap.get(screen);
    if (screenWindow && screenWindow.webContents) {
        screenWindow.webContents.send("app:screen-window-update", {
            payload: payload
        });
    }
}

ipcMain.on("send-screen-window-update", (event, args) => {
    const payload = args.payload;

    sendScreenWindowUpdate(args.screen, payload);
});

ipcMain.on("screen-window:show", (event, arg) => {
    let screenWindow: BrowserWindow;
    const screenExist = windowsMap.has(arg.screen);

    if (!screenExist) {
        screenWindow = createScreenWindow(mainWindow, arg.screen);
        if (arg.position.length > 0) {
            screenWindow.setPosition(arg.position.x, arg.position.y);
        }
    } else {
        screenWindow = windowsMap.get(arg.screen);
    }

    if (!screenWindow.isVisible()) {
        screenWindow.show();
    }

    if (isDev) {
        screenWindow.webContents.openDevTools();
    }

    windowsMap.set(arg.screen, screenWindow);

    const sendEnableMessage = () => {
        screenWindow.webContents.send("app:screen-window-enable", {
            screen: arg.screen,
            payload: arg.payload
        });
    };

    screenExist ? sendEnableMessage() : screenWindow.webContents.once("did-finish-load", () => sendEnableMessage());

    screenWindow.on("closed", () => {
        windowsMap.delete(arg.screen);
    });
});

app.whenReady().then(async (): Promise<void> => {
    mainWindow = createWindow();
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
    mainWindow.on("close", function (event: Event): void {
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

    await autoUpdater.checkForUpdates();

    configureLocalShortcut(mainWindow);

    const userDataPath = app.getPath("userData");

    storage.setDataPath(path.join(userDataPath, "storage"));

    await electronTray.init(mainWindow);
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

ipcMain.on("zoom-level", (): void => {
    let zoomFactor = 1.0;

    const storageZoomValue = () => storage.getSync("zoomLevel");

    // @ts-ignore
    if (storageZoomValue().value > 0) {
        // @ts-ignore
        zoomFactor = storageZoomValue().value;
    }

    mainWindow.webContents.send("zoom-level.reply", zoomFactor);
});

ipcMain.on("main:openLink", (event: Electron.IpcMainEvent, url: any): void => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    shell.openExternal(url).then((): void => {});
});

ipcMain.on("main:toggle-always-on-top", (event, arg) => {
    setTimeout(() => mainWindow.setAlwaysOnTop(arg), 200);
});

ipcMain.on("main:is-always-on-top", (event): void => {
    event.reply("main:is-always-on-top", { is_always_on_top: mainWindow.isAlwaysOnTop() });
});

ipcMain.on("main:app-version", (event): void => {
    event.reply("main:app-version.reply", { version: app.getVersion() });
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

    await mainWindow.webContents.send("main:dialog-choice", choice);
});

ipcMain.on("main:download-progress-info", async (event, args) => {
    const properties: any = {
        onProgress: (progress: number) => {
            mainWindow.webContents.send("autoUpdater:download-progress", progress);
        },
        onCompleted: (item: CompletedInfo) => {
            mainWindow.webContents.send("autoUpdater:download-complete", item);
        }
    };

    await download(mainWindow, args, properties);
});

ipcMain.on("main:check-upload", async (): Promise<void> => {
    if (!isMac) {
        await autoUpdater.downloadUpdate();
    } else {
        await shell.openExternal("https://github.com/laradumps/app/releases/latest");
    }
});

ipcMain.on("main:download-complete", async (event, args) => {
    const result = await dialog.showMessageBox({
        type: "info",
        title: "Update completed!",
        message: "The download was completed successfully!, do you want to install now?",
        buttons: ["Yes", "No"]
    });

    if (result.response === 0) {
        await shell.openPath(args);

        setTimeout(() => app.quit(), 1000);
    }
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

ipcMain.on("platform", (event, args) => {
    event.reply("platform.reply", process.platform);
});

customWindow.init();
electronAutoLaunch.init();
electronStore.init();
ssh.init();
