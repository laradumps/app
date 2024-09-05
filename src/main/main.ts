import {
    app,
    Tray,
    nativeTheme,
    nativeImage,
    BrowserWindow,
    Menu,
    BrowserWindowConstructorOptions,
    dialog,
    ipcMain,
    shell,
    IpcMainEvent, Notification
} from "electron";
import windowStateKeeper from "electron-window-state";
import { autoUpdater, UpdateFileInfo, UpdateInfo } from "electron-updater";
import { download } from "electron-dl";
import JSConfetti from "js-confetti";

import path, { join, resolve } from "path";
import os from "os";
import * as url from "url";
import fs from "fs";

import storage from "electron-json-storage";

import { initSavedDumps } from "./window/saved-dumps";
import { initCoffeeWindow } from "./window/coffee";

import { configureLocalShortcut, registerShortcuts } from "./shortcut";

import { CompletedInfo } from "@/types/Updater";
import { createMenu } from "./main-menu";

const isDev: boolean = process.env.NODE_ENV === "development";
const isMac: boolean = process.platform === "darwin";
const AutoLaunch = require("auto-launch");

let mainWindow: BrowserWindow;
let coffeeWindow: BrowserWindow;
let savedDumpWindow: BrowserWindow;
let tray: Electron.Tray;
let isQuiting: boolean;
let globalUpdateInfo: UpdateInfo;

storage.setDataPath(os.tmpdir());

const electronLocalShortcut = require("electron-localshortcut");

if (!isDev) {
    const autoLauncher = new AutoLaunch({ name: "LaraDumps" });

    ipcMain.on("main-menu:set-auto-launch", (event: Electron.IpcMainEvent, arg): void => {
        arg.value === "disabled" ? autoLauncher.disable() : autoLauncher.enable();
    });
}

ipcMain.on("dump", (event: Electron.IpcMainEvent, arg): void => {
    if (!Object.prototype.hasOwnProperty.call(arg.content, "meta")) {
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
        width: isDev ? 1080 : 650,
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

        autoUpdater.autoDownload = false;

        autoUpdater.on("update-available", async (updateInfo: UpdateInfo): Promise<void> => {
            setTimeout(async (): Promise<void> => {
                if (process.platform === "darwin") {
                    globalUpdateInfo = updateInfo;
                    mainWindow.webContents.send("update-available", updateInfo);
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
            }, 2000);
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

    electronLocalShortcut.register("CommandOrControl+Shift+X", (): void => {
        mainWindow.reload();

        mainWindow.webContents.send("assetsPath", path.join(app.getAppPath(), "src/assets"));
    });

    win.once("ready-to-show", (): void => {
        win.show();
        win.focus();

        mainWindow.webContents.send("assetsPath", path.join(app.getAppPath(), "src/assets"));

        if (isDev) {
            win.webContents.openDevTools();
        }
    });

    return win;
}

app.whenReady().then(async (): Promise<void> => {
    mainWindow = createWindow();
    coffeeWindow = initCoffeeWindow();
    savedDumpWindow = initSavedDumps();

    createMenu(mainWindow);

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
            nodeIntegration: true,
            contextIsolation: false,
            preload: resolve(__dirname, "preload.js")
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
        `);
    });
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

ipcMain.on("main:download-update", (): void => {
    setTimeout(async (): Promise<void> => {
        if (process.platform === "darwin") {
            const downloadPath: string = app.getPath("downloads");

            const files: UpdateFileInfo[] = globalUpdateInfo.files;
            const filteredFiles: UpdateFileInfo = files.filter((file: UpdateFileInfo) => file.url.includes("dmg"))[0];
            const fileName: string = filteredFiles.url;

            const downloadedFile = `${downloadPath}/${fileName}`;

            if (fs.existsSync(downloadedFile)) {
                await shell.openPath(downloadedFile);

                isQuiting = true;
                app.quit();
            } else {
                mainWindow.webContents.send("autoUpdater:update-info", globalUpdateInfo);
            }
        } else {
            mainWindow.webContents.send("update-info", globalUpdateInfo);
            await autoUpdater.downloadUpdate();
        }
    }, 3000);
});

ipcMain.on("native-theme", () => {
    if (nativeTheme.shouldUseDarkColors) {
        mainWindow.webContents.send("app:theme-dark");
    } else {
        mainWindow.webContents.send("app:theme-light");
    }
});

nativeTheme.on("updated", () => {
    nativeTheme.shouldUseDarkColors ? mainWindow.webContents.send("app:theme-dark") : mainWindow.webContents.send("app:theme-light");
});

ipcMain.on("main:pause-dumps", (event, args) => {
    mainWindow.webContents.send("app:pause-dumps", args);
});


interface EnvironmentStorage {
    project: string;
    path: any;
}

interface DataStructure {
    app: {
        primary_host: string;
        secondary_host: string;
        port: number;
        workdir: string;
        project_path: string;
    };
    config: {
        auto_clear_on_page_reload: boolean;
        auto_invoke_app: boolean;
        theme: string;
        sleep: number;
        color_in_screen: boolean;
        docker: boolean;
    };
    observers: {
        [key: string]: boolean;
    };
}


ipcMain.on("environment::get", async () => {
    const all = (): Promise<EnvironmentStorage[]> => {
        return new Promise((resolve, reject) => {
            storage.keys((error: Error | null, keys: string[]) => {
                if (error) {
                    reject(error);
                    return;
                }

                const projects: EnvironmentStorage[] = [];

                for (const key of keys) {
                    if (key.startsWith("environment_")) {
                        const project = key.replace("environment_", "");
                        const path = storage.getSync(key);
                        const existingProjectIndex = projects.findIndex((p) => p.project === project);
                        if (existingProjectIndex === -1) {
                            projects.push({ project, path });
                        } else {
                            projects[existingProjectIndex].path = path;
                        }
                    }
                }

                resolve(projects);
            });
        });
    };

    const environmentStorages = await all();
    mainWindow.webContents.send("app-setting:set-environment", environmentStorages);
});

ipcMain.on("environment::check", (event: IpcMainEvent, value: { applicationPath: string }): void => {
    let path = value.applicationPath;

    if (path == "") {
        new Notification({
            title: "LaraDumps Info",
            body: 'The file: "laradumps.yaml" is not found in the project root'
        }).show();

        return;
    }

    if (path == undefined) {
        return;
    }

    if (path.endsWith("/")) {
        path = path.slice(0, -1);
    }

    const project = path.split("/").pop();

    // Check if the storage key 'environment_' + project exists
    storage.has(`environment_${project}`, (error: Error | null, hasKey: boolean): void => {
        if (error) {
            console.error("Error checking storage:", error);
            return;
        }

        // If the key doesn't exist, add it with the corresponding value
        if (!hasKey) {
            storage.set(`environment_${project}`, path, (error: Error | null): void => {
                if (error) {
                    console.error("Error setting storage:", error);
                    return;
                }

                mainWindow.webContents.send("app-setting:project-added");

                console.log(`Added environment_${project} to storage with value: ${path}`);
            });
        } else {
            console.log(`environment_${project} already exists in storage.`);
        }

        const storageEnvironment = (): Promise<object> => {
            return new Promise((resolve) => {
                storage.get(`environment_${project}`, (error: Error | null, data: any) => {
                    if (error) {
                        console.error("Error getting storage:", error);
                        resolve({});
                        return;
                    }
                    resolve(data);
                });
            });
        };

        storageEnvironment().then(async (storageEnvironment: Object): Promise<void> => {
            ipcMain.emit("environment::get");
            setTimeout(() => mainWindow.webContents.send("app-setting:set-active", storageEnvironment), 200);
        });
    });
});

ipcMain.on("main:setting-get-environments", (event: IpcMainEvent, value: string): void => {
    const file = value + "/laradumps.yaml";

    try {
        const yaml = require("js-yaml");
        const fs = require("fs");

        const readFile = yaml.load(fs.readFileSync(file, "utf8"));

        const parseYaml = Object.entries({ ...readFile.observers }).map(([key, val], index) => {
            return {
                id: index,
                value: key,
                name: key.replace(/_/g, " "),
                selected: val
            };
        });

        mainWindow.webContents.send("settings:env-file-contents", parseYaml);
    } catch (e) {
        console.error(e);
        mainWindow.webContents.send("settings:env-file-contents", []);
    }
});

ipcMain.on("main:setting-remove-environments", (event: IpcMainEvent, value: string): void => {
    let path = value;

    if (path.endsWith("/")) {
        path = path.slice(0, -1);
    }

    const project = path.split("/").pop();

    storage.remove(`environment_${project}`, (error: Error | null) => {
        if (error) {
            console.error("Error removing storage:", error);
        }
        ipcMain.emit("environment::get");
    });
});

ipcMain.on("main:settings-update-environment", (event: Electron.IpcMainEvent, value): void => {
    const { selected, project } = value;
    const filePath = `${project}/laradumps.yaml`;

    const yaml = require("js-yaml");
    const fs = require("fs");

    let data: DataStructure;

    try {
        const fileContents = fs.readFileSync(filePath, "utf8");
        data = yaml.load(fileContents);

        selected.forEach((item: { value: string; selected: boolean }) => {
            data.observers[item.value] = item.selected;
        });

        const yamlData = yaml.dump(data);

        fs.writeFile(filePath, yamlData, (err: NodeJS.ErrnoException | null): void => {
            if (err) {
                console.error("Error writing to file:", err);
                return;
            }
            console.log("laradumps.yaml has been updated successfully.");
        });
    } catch (err) {
        console.error(err);
    }
});
