import { app, Tray, nativeTheme, nativeImage, BrowserWindow, Menu, BrowserWindowConstructorOptions, dialog, ipcMain, shell, globalShortcut } from "electron";
import windowStateKeeper from "electron-window-state";
import path, { join, resolve } from "path";
import contextMenu from "electron-context-menu";
import storage from "electron-json-storage";
import os from "os";
import { initSavedDumps } from "./saved-dumps";
import { initCoffeeWindow } from "./coffee";
import { configureGlobalShortcut, registerShortcuts } from "./global-shortcut";
import { configureEnvironment } from "./environment";
import { autoUpdater, UpdateFileInfo, UpdateInfo } from "electron-updater";
import * as url from "url";
import fs from "fs";
import { download } from "electron-dl";
import { CompletedInfo } from "@/types/Updater";

const isDev: boolean = process.env.NODE_ENV === "development";
const isMac: boolean = process.platform === "darwin";

let mainWindow: BrowserWindow;
let coffeeWindow: BrowserWindow;
let savedDumpWindow: BrowserWindow;
let tray: Electron.Tray;
let isQuiting: boolean;

const minPackageVersion = "0.1.0";

if (isDev) {
    contextMenu({
        showInspectElement: true
    });
}

storage.setDataPath(os.tmpdir());

ipcMain.on("dump", (event: Electron.IpcMainEvent, arg): void => {
    const packageVersion: string = arg.content.meta.laradumps_version.replaceAll(".", "");

    if (packageVersion === "000") {
        event.sender.send(arg.type, arg);
    }

    if (!isNaN(Number(packageVersion)) && parseInt(packageVersion) < parseInt(minPackageVersion.replaceAll(".", ""))) {
        event.sender.send("ipc:package-down", {
            packageVersion,
            minPackageVersion
        });

        return;
    }

    event.sender.send(arg.type, arg);
});

function createWindow(): BrowserWindow {
    const winState: windowStateKeeper.State = windowStateKeeper({
        defaultWidth: 670,
        defaultHeight: 660
    });

    const browserWindowOptions: BrowserWindowConstructorOptions = {
        fullscreen: false,
        fullscreenable: false,
        width: isDev ? 1080 : 670,
        height: 660,
        resizable: true,
        alwaysOnTop: true,
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

    const win: BrowserWindow = new BrowserWindow(browserWindowOptions);

    winState.manage(win);

    if (isDev) {
        win.loadURL(`http://localhost:4999`);
    } else {
        win.loadURL(
            url.format({
                pathname: join(__dirname, "app", "index.html"),
                protocol: "file:",
                slashes: true
            })
        );

        autoUpdater.autoDownload = false;

        autoUpdater.on("update-available", async (updateInfo: UpdateInfo): Promise<void> => {
            setTimeout(async (): Promise<void> => {
                if (process.platform === "darwin") {
                    const downloadPath: string = app.getPath("downloads");

                    const files: UpdateFileInfo[] = updateInfo.files;
                    const filteredFiles: UpdateFileInfo = files.filter((file: UpdateFileInfo) => file.url.includes("dmg"))[0];
                    const fileName: string = filteredFiles.url;

                    const downloadedFile = `${downloadPath}/${fileName}`;

                    if (fs.existsSync(downloadedFile)) {
                        const result = await dialog.showMessageBox({
                            type: "info",
                            title: "LaraDumps update downloaded!",
                            message: "Download has already been done, do you want to open it?",
                            buttons: ["Yes", "No"]
                        });

                        if (result.response === 0) {
                            await shell.openPath(downloadedFile);

                            isQuiting = true;
                            app.quit();
                        }
                    } else {
                        await dialog.showMessageBox({
                            type: "info",
                            title: "LaraDumps update available!",
                            message: "There are updates available for LaraDumps App.",
                            buttons: ["Ok"]
                        });

                        mainWindow.webContents.send("autoUpdater:update-info", updateInfo);
                    }
                } else {
                    const result = await dialog.showMessageBox({
                        type: "info",
                        title: "LaraDumps update available!",
                        message: "There are updates available for LaraDumps App. Would you like to update it now?",
                        buttons: ["Yes", "No"]
                    });

                    if (result.response === 0) {
                        mainWindow.webContents.send("update-info", updateInfo);
                        await autoUpdater.downloadUpdate();
                    }
                }
            }, 3000);
        });

        autoUpdater.on("update-downloaded", async (): Promise<void> => {
            mainWindow.show();

            await dialog.showMessageBox(
                new BrowserWindow({
                    show: false,
                    alwaysOnTop: true
                }),
                {
                    title: "Install Updates",
                    message: "Update completed! Restarting the application..."
                }
            );
            setImmediate(() => autoUpdater.quitAndInstall());
        });
    }

    win.once("ready-to-show", (): void => {
        win.show();
        win.focus();
        if (isDev) {
            win.webContents.openDevTools();
        }
    });

    return win;
}

function createMenu(): void {
    const menuTemplate: Electron.MenuItemConstructorOptions[] = [
        {
            label: "Menu",
            submenu: [
                {
                    label: "About LaraDumps",
                    click: async (): Promise<void> => {
                        await shell.openExternal("https://github.com/laradumps/app");
                    }
                },
                {
                    type: "separator"
                },
                {
                    label: "Quit LaraDumps",
                    accelerator: process.platform === "darwin" ? "Command+Q" : "Ctrl+Q",
                    click: () => {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: "Help",
            submenu: [
                {
                    label: "Documentation",
                    click: async (): Promise<void> => {
                        await shell.openExternal("https://laradumps.dev");
                    }
                },
                {
                    type: "separator"
                },
                {
                    label: "Releases",
                    click: async (): Promise<void> => {
                        await shell.openExternal("https://github.com/laradumps/app/releases");
                    }
                }
            ]
        }
    ];

    // Enables copy to clipboard in macOS
    if (process.platform === "darwin") {
        menuTemplate.splice(1, 0, {
            label: "Edit",
            submenu: [
                {
                    label: "Copy",
                    accelerator: "CmdOrCtrl+C",
                    selector: "copy:"
                }
            ]
        });
    }

    const menu: Menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);
}

app.whenReady().then(async (): Promise<void> => {
    createMenu();

    mainWindow = createWindow();
    coffeeWindow = initCoffeeWindow();
    savedDumpWindow = initSavedDumps();

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
        if (isMac && !isQuiting) {
            event.preventDefault();
            mainWindow.minimize();

            return;
        }

        // @ts-ignore
        const choice = dialog.showMessageBoxSync(this, {
            type: "question",
            buttons: ["Yes", "No"],
            title: "Confirm",
            message: "Are you sure you want to quit?"
        });

        if (choice === 1) {
            event.preventDefault();
            return;
        }

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

    configureGlobalShortcut(mainWindow);
    configureEnvironment(mainWindow);

    if (isMac) {
        const iconPath: string = path.join(app.getAppPath(), "src/img/icon@2x.png");
        let trayIcon: Electron.NativeImage = nativeImage.createFromPath(iconPath);

        trayIcon = trayIcon.resize({
            width: 16,
            height: 16
        });

        tray = new Tray(trayIcon);

        const contextMenu: Electron.Menu = Menu.buildFromTemplate([
            {
                label: "Preferences",
                click: async (): Promise<void> => {
                    mainWindow.webContents.send("app::toggle-settings");
                }
            },
            { label: "separator", type: "separator" },
            {
                label: "Exit",
                accelerator: "Command+Q",
                click: async (): Promise<void> => {
                    isQuiting = true;
                    app.quit();
                }
            }
        ]);

        tray.setToolTip("LaraDumps");

        tray.on("click", () => {
            tray.setContextMenu(null);
            if (!mainWindow.isVisible()) {
                mainWindow.show();
            }
        });

        tray.on("right-click", () => {
            tray.setContextMenu(contextMenu);
            tray.popUpContextMenu();
        });
    }
});

app.on("before-quit", function (): void {
    isQuiting = true;
});

app.on("window-all-closed", (): void => {
    app.quit();
});

app.on("activate", (): void => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

app.on("will-quit", () => {
    globalShortcut.unregister("CommandOrControl+Shift+X");
    globalShortcut.unregisterAll();
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

ipcMain.on("main:open-custom-window", (event, link) => {
    const window: BrowserWindow = new BrowserWindow({
        show: true,
        width: 830,
        height: 690,
        webPreferences: {
            nodeIntegration: true
        },
        alwaysOnTop: true,
        title: link.title
    });

    window.loadURL(link.url);

    const template = [
        {
            label: "View",
            submenu: [
                {
                    label: "Toggle Dev Tools",
                    accelerator: process.platform === "darwin" ? "Alt+Command+I" : "Ctrl+Shift+I",
                    click: () => {
                        window.webContents.toggleDevTools();
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
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

        setTimeout(() => {
            isQuiting = true;
            app.quit();
        }, 1000);
    }
});

ipcMain.on("native-theme", () => {
    if (nativeTheme.shouldUseDarkColors) {
        mainWindow.webContents.send("app:theme-dark");
    } else {
        mainWindow.webContents.send("app:theme-light");
    }
});

nativeTheme.on("updated", () => {
    if (nativeTheme.shouldUseDarkColors) {
        mainWindow.webContents.send("app:theme-dark");
    } else {
        mainWindow.webContents.send("app:theme-light");
    }
});
