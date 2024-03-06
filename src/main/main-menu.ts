import { app, BrowserWindow, Menu, shell } from "electron";

function createMenu(mainWindow: BrowserWindow): void {
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
                    label: "Reorder",
                    click: async (): Promise<void> => {
                        mainWindow.webContents.send("app::toggle-reorder");
                    }
                },
                {
                    label: "Privacy Mode",
                    click: async (): Promise<void> => {
                        mainWindow.webContents.send("app::toggle-privacy");
                    }
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
                {
                    label: "Light",
                    click: () => {
                        mainWindow.webContents.send("changeTheme", { theme: "light" });
                    },
                    type: "radio"
                },
                {
                    label: "Dark",
                    click: () => {
                        mainWindow.webContents.send("changeTheme", { theme: "dark" });
                    },
                    type: "radio",
                    checked: true
                },
                {
                    label: "Dracula",
                    click: () => {
                        mainWindow.webContents.send("changeTheme", { theme: "dracula" });
                    },
                    type: "radio"
                },
                {
                    label: "Dim",
                    click: () => {
                        mainWindow.webContents.send("changeTheme", { theme: "dim" });
                    },
                    type: "radio"
                },
                {
                    label: "Retro",
                    click: () => {
                        mainWindow.webContents.send("changeTheme", { theme: "retro" });
                    },
                    type: "radio"
                },
                {
                    label: "Halloween",
                    click: () => {
                        mainWindow.webContents.send("changeTheme", { theme: "halloween" });
                    },
                    type: "radio"
                },
                {
                    label: "Cyberpunk",
                    click: () => {
                        mainWindow.webContents.send("changeTheme", { theme: "cyberpunk" });
                    },
                    type: "radio"
                },
                {
                    label: "Laravel",
                    click: () => {
                        mainWindow.webContents.send("changeTheme", { theme: "laravel" });
                    },
                    type: "radio"
                }
            ]
        },
        {
            label: "IDE",
            submenu: [
                {
                    label: "PHPStorm",
                    click: () => {
                        mainWindow.webContents.send("changeIDE", { value: "phpstorm://open?file={filepath}&line={line}" });
                    },
                    type: "radio",
                    checked: true
                },
                {
                    label: "VS Code",
                    click: () => {
                        mainWindow.webContents.send("changeIDE", { value: "vscode://file/{filepath}:{line}" });
                    },
                    type: "radio"
                },

                {
                    label: "VS Code Remote",
                    click: () => {
                        mainWindow.webContents.send("changeIDE", { value: "vscode://vscode-remote/" });
                    },
                    type: "radio"
                },
                {
                    label: "Sublime",
                    click: () => {
                        mainWindow.webContents.send("changeIDE", { value: "subl://open?url=file://{filepath}&line={line}" });
                    },
                    type: "radio"
                },
                {
                    label: "Atom",
                    click: () => {
                        mainWindow.webContents.send("changeIDE", { value: "atom://core/open/file?filename={filepath}&line={line}" });
                    },
                    type: "radio"
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

export { createMenu };
