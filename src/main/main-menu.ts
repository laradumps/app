import { app, BrowserWindow, ipcMain, Menu, shell } from "electron";
import storage from "electron-json-storage";

interface IDEHandlerSelected {
    value: string;
}

interface ThemeSelected {
    value: string;
}

interface AutoLaunch {
    value: string;
}

ipcMain.on("main-menu:set-ide-handler-selected", (event, args) => {
    storage.set(`IDEHandler`, args, (error: Error | null): void => {
        if (error) {
            console.error("Error setting storage:", error);
            return;
        }
    });
});

ipcMain.on("main-menu:set-theme-selected", (event, args) => {
    storage.set(`Theme`, args, (error: Error | null): void => {
        if (error) {
            console.error("Error setting storage:", error);
            return;
        }
    });
});

ipcMain.on("main-menu:set-auto-launch", (event, args) => {
    storage.set(`AutoLaunch`, args, (error: Error | null): void => {
        if (error) {
            console.error("Error setting storage:", error);
            return;
        }
    });
});

async function getMenuTemplate(mainWindow: BrowserWindow, windowsMap: Map) {
    let IDEHandlerSelected: IDEHandlerSelected;
    let ThemeSelected: ThemeSelected;
    let AutoLaunch: AutoLaunch;

    try {
        IDEHandlerSelected = await new Promise((resolve, reject) => {
            storage.get(`IDEHandler`, (error, data: Object) => {
                if (error) {
                    console.error("Error getting storage:", error);
                    reject(error);
                } else {
                    resolve(data);
                }
            });
        });
    } catch (error) {
        console.error("Error getting IDEHandler from storage:", error);
        IDEHandlerSelected = { value: "" };
    }

    try {
        ThemeSelected = await new Promise((resolve, reject) => {
            storage.get(`Theme`, (error, data: Object) => {
                if (error) {
                    console.error("Error getting storage:", error);
                    reject(error);
                } else {
                    resolve(data);
                }
            });
        });
    } catch (error) {
        console.error("Error getting ThemeSelected from storage:", error);
        ThemeSelected = { value: "" };
    }

    try {
        AutoLaunch = await new Promise((resolve, reject) => {
            storage.get(`AutoLaunch`, (error, data: Object) => {
                if (error) {
                    console.error("Error getting storage:", error);
                    reject(error);
                } else {
                    resolve(data);
                }
            });
        });
    } catch (error) {
        console.error("Error getting AutoLaunch from storage:", error);
        AutoLaunch = { value: "" };
    }

    const createIDEItem = (label: string, value: string) => ({
        label,
        click: () => {
            mainWindow.webContents.send("changeIDE", { value });
        },
        type: "radio",
        checked: IDEHandlerSelected.value === value
    });

    const createThemeItem = (label: string, value: string) => ({
        label,
        click: () => {
            mainWindow.webContents.send("changeTheme", { value });

            windowsMap.forEach((window: BrowserWindow) => {
                window.webContents.send("changeTheme", { value });
            });
        },
        type: "radio",
        checked: ThemeSelected.value === value
    });

    const createAutoLaunchItem = (label: string, value: string) => ({
        label,
        click: () => {
            mainWindow.webContents.send("changeAutoLaunch", { value });
        },
        type: "radio",
        checked: AutoLaunch.value === value
    });

    const menuTemplate = [
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
                    label: "Settings",
                    click: async (): Promise<void> => {
                        mainWindow.webContents.send("app::toggle-settings");
                    }
                },
                {
                    label: "Language",
                    submenu: [
                        {
                            label: "English",
                            click: async (): Promise<void> => {
                                mainWindow.webContents.send("settings:set-language", {
                                    value: "en",
                                    label: "English"
                                });
                            },
                            type: "radio"
                        },
                        {
                            label: "Português (BR)",
                            click: async (): Promise<void> => {
                                mainWindow.webContents.send("settings:set-language", {
                                    value: "pt_BR",
                                    label: "Português (BR)"
                                });
                            },
                            type: "radio"
                        },
                        {
                            label: "Español (ES)",
                            click: async (): Promise<void> => {
                                mainWindow.webContents.send("settings:set-language", {
                                    value: "es_ES",
                                    label: "Español (ES)"
                                });
                            },
                            type: "radio"
                        },
                        {
                            label: "فارسی (IR)",
                            click: async (): Promise<void> => {
                                mainWindow.webContents.send("settings:set-language", {
                                    value: "es_ES",
                                    label: "فارسی (IR)"
                                });
                            },
                            type: "radio"
                        },
                        {
                            label: "عربي (AR)",
                            click: async (): Promise<void> => {
                                mainWindow.webContents.send("settings:set-language", {
                                    value: "ar_AR",
                                    label: "عربي (AR)"
                                });
                            },
                            type: "radio"
                        },
                        {
                            label: "Italiano (IT)",
                            click: async (): Promise<void> => {
                                mainWindow.webContents.send("settings:set-language", {
                                    value: "it_IT",
                                    label: "Italiano (IT)"
                                });
                            },
                            type: "radio"
                        },
                        {
                            label: "Chinese (CN)",
                            click: async (): Promise<void> => {
                                mainWindow.webContents.send("settings:set-language", {
                                    value: "zh_CN",
                                    label: "Chinese (CN)"
                                });
                            },
                            type: "radio"
                        },
                        {
                            label: "Indonesian (ID)",
                            click: async (): Promise<void> => {
                                mainWindow.webContents.send("settings:set-language", {
                                    value: "id_ID",
                                    label: "Indonesian (ID)"
                                });
                            },
                            type: "radio"
                        },
                        {
                            label: "Shqip (AL)",
                            click: async (): Promise<void> => {
                                mainWindow.webContents.send("settings:set-language", {
                                    value: "al_AL",
                                    label: "Shqip (AL)"
                                });
                            },
                            type: "radio"
                        }
                    ]
                },
                {
                    label: "Check for Updates",
                    submenu: [
                        {
                            label: "Automatic",
                            click(menuItem, browserWindow, event) {
                                mainWindow.webContents.send("settings:check-for-updates", {
                                    value: "auto_download",
                                    label: "Automatic"
                                });
                            },
                            type: "radio"
                        },
                        {
                            label: "Manual",
                            click(menuItem, browserWindow, event) {
                                mainWindow.webContents.send("settings:check-for-updates", {
                                    value: "manual_download",
                                    label: "Manual Download"
                                });
                            },
                            type: "radio"
                        }
                    ]
                },
                {
                    label: "Auto-Launch",
                    submenu: [createAutoLaunchItem("Enabled", "enabled"), createAutoLaunchItem("Disabled", "disabled")]
                },
                {
                    label: "Shortcuts",
                    click: async (): Promise<void> => {
                        mainWindow.webContents.send("app::toggle-settings");
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
            label: "Options",
            submenu: [
                {
                    label: "Scroll Direction",
                    submenu: [
                        {
                            label: "Top",
                            click: async (): Promise<void> => {
                                mainWindow.webContents.send("app::scroll-direction", { value: 'top'});
                                windowsMap.forEach((window: BrowserWindow) => {
                                    window.webContents.send("app::scroll-direction", { value: 'top'});
                                });
                            },
                            type: "radio"
                        },
                        {
                            label: "Bottom",
                            click: async (): Promise<void> => {
                                mainWindow.webContents.send("app::scroll-direction", { value: 'bottom'});
                                windowsMap.forEach((window: BrowserWindow) => {
                                    window.webContents.send("app::scroll-direction", { value: 'bottom'});
                                });
                            },
                            type: "radio"
                        },
                    ]
                },
                {
                    label: "Saved Dumps",
                    click: async (): Promise<void> => {
                        mainWindow.webContents.send("app::show-saved-dumps");
                    }
                }
            ]
        },
        {
            label: "Theme",
            submenu: [
                createThemeItem("Light", "light"),
                createThemeItem("Dark", "dark"),
                createThemeItem("Dracula", "dracula"),
                createThemeItem("Dim", "dim"),
                createThemeItem("Retro", "retro"),
                createThemeItem("Halloween", "halloween"),
                createThemeItem("Cyberpunk", "cyberpunk"),
                createThemeItem("Laravel", "laravel"),
                createThemeItem("Lemonade", "lemonade"),
                createThemeItem("Winter", "winter")
            ]
        },
        {
            label: "IDE",
            submenu: [
                createIDEItem("PHPStorm", "phpstorm://open?file={filepath}&line={line}"),
                createIDEItem("PHPStorm WSL", "phpstorm://open?file={wsl_config}{filepath}&line={line}"),
                createIDEItem("VS Code", "vscode://file/{filepath}:{line}"),
                createIDEItem("VS Code Remote", "vscode://vscode-remote/{wsl_config}{filepath}:{line}"),
                createIDEItem("VS Code Insiders", "vscode-insiders://file/{filepath}:{line}"),
                createIDEItem("Sublime", "subl://open?url=file://{filepath}&line={line}"),
                createIDEItem("Atom", "atom://core/open/file?filename={filepath}&line={line}")
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
                    label: "Desktop Releases",
                    click: async (): Promise<void> => {
                        await shell.openExternal("https://github.com/laradumps/app/releases");
                    }
                },
                {
                    label: "Laravel Package",
                    click: async (): Promise<void> => {
                        await shell.openExternal("https://github.com/laradumps/laradumps");
                    }
                },
                {
                    label: "Core Package",
                    click: async (): Promise<void> => {
                        await shell.openExternal("https://github.com/laradumps/laradumps-core");
                    }
                },
                {
                    type: "separator"
                },
                {
                    label: "Sponsors",
                    click: async (): Promise<void> => {
                        await shell.openExternal("https://github.com/sponsors/luanfreitasdev");
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

    return menuTemplate;
}

async function createMenu(mainWindow, a, b) {
    const menuTemplate = await getMenuTemplate(mainWindow, a, b);

    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);
}

export { createMenu };
