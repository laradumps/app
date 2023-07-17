import storage from "electron-json-storage";
import os from "os";
import { BrowserWindow, globalShortcut, ipcMain } from "electron";

interface ShortcutData {
    alias: string;
    keys: string;
}

/**
 * Registers a global shortcut for clearing all data.
 * @param mainWindow - The BrowserWindow instance.
 */
const registerGlobalShortCutForClearAll = (mainWindow: BrowserWindow): void => {
    storage.setDataPath(os.tmpdir());

    // @ts-ignore
    storage.get("ds_shortcut_clearAll", (error, data: ShortcutData): void => {
        if (error) {
            // eslint-disable-next-line no-console
            console.error(error);
            return;
        }

        if (data?.keys) {
            try {
                globalShortcut.register(data.keys, (): void => {
                    // eslint-disable-next-line no-console
                    console.log("executing clearAll!");
                    mainWindow.webContents.send("app:global-shortcut-execute::clearAll");
                });
            } catch (error) {
                // eslint-disable-next-line no-console
                console.error(`Error registering shortcut: ${error}`);
            }
        }
    });
};

/**
 * Registers a global shortcut for dark mode.
 * @param mainWindow - The BrowserWindow instance.
 */
const registerGlobalShortCutForDarkMode = (mainWindow: BrowserWindow): void => {
    storage.setDataPath(os.tmpdir());

    // @ts-ignore
    storage.get("ds_shortcut_darkMode", (error, data: ShortcutData): void => {
        // eslint-disable-next-line no-console
        if (error) console.error(error);

        if (data.keys.toString() !== "") {
            // @ts-ignore
            globalShortcut.register(data.keys, (): void => {
                // eslint-disable-next-line no-console
                console.log("executing darkMode!");

                mainWindow.webContents.send("app:global-shortcut-execute::darkMode");
            });
        }
    });
};

/**
 * Registers a global shortcut for  always on top.
 * @param mainWindow - The BrowserWindow instance.
 */
const registerGlobalShortCutForAlwaysOnTop = (mainWindow: BrowserWindow): void => {
    storage.setDataPath(os.tmpdir());

    // @ts-ignore
    storage.get("ds_shortcut_alwaysOnTop", (error, data: ShortcutData): void => {
        // eslint-disable-next-line no-console
        if (error) console.error(error);

        if (data.keys.toString() !== "") {
            // @ts-ignore
            globalShortcut.register(data.keys, (): void => {
                // eslint-disable-next-line no-console
                console.log("executing alwaysOnTop!");

                mainWindow.webContents.send("app:global-shortcut-execute::alwaysOnTop");
            });
        }
    });
};

/**
 * Registers a global shortcut for global search.
 * @param mainWindow - The BrowserWindow instance.
 */
const registerGlobalShortCutForSearch = (mainWindow: BrowserWindow): void => {
    storage.setDataPath(os.tmpdir());

    // @ts-ignore
    storage.get("ds_shortcut_globalSearch", (error, data: ShortcutData): void => {
        // eslint-disable-next-line no-console
        if (error) console.error(error);

        if (data.keys.toString() !== "") {
            // @ts-ignore
            globalShortcut.register(data.keys, (): void => {
                // eslint-disable-next-line no-console
                console.log("executing globalSearch!");

                mainWindow.webContents.send("app:global-shortcut-execute::globalSearch");
            });
        }
    });
};

/**
 * Registers a global shortcut for toggle menu.
 * @param mainWindow - The BrowserWindow instance.
 */
const registerGlobalShortCutForToggleMenu = (mainWindow: BrowserWindow): void => {
    storage.setDataPath(os.tmpdir());

    // @ts-ignore
    storage.get("ds_shortcut_toggleMenu", (error, data: ShortcutData): void => {
        // eslint-disable-next-line no-console
        if (error) console.error(error);

        if (data.keys.toString() !== "") {
            // @ts-ignore
            globalShortcut.register(data.keys, () => {
                // eslint-disable-next-line no-console
                console.log("executing toggleMenu!");

                mainWindow.webContents.send("app:global-shortcut-execute::toggleMenu");
            });
        }
    });
};

function registerShortcuts(mainWindow: BrowserWindow, alias = null): void {
    if (!alias) {
        // Sending configured shortcuts
        storage.keys((error, keys: string[]): void => {
            // eslint-disable-next-line no-console
            if (error) console.error(error);

            keys.forEach((key: string): void => {
                if (key.startsWith("ds_shortcut_")) {
                    // @ts-ignore
                    storage.get(key, (error, data: ShortcutData): void => {
                        // eslint-disable-next-line no-console
                        if (error) console.error(error);

                        switch (data.alias) {
                            case "clearAll":
                                registerGlobalShortCutForClearAll(mainWindow);
                                break;
                            case "darkMode":
                                registerGlobalShortCutForDarkMode(mainWindow);
                                break;
                            case "alwaysOnTop":
                                registerGlobalShortCutForAlwaysOnTop(mainWindow);
                                break;
                            case "globalSearch":
                                registerGlobalShortCutForSearch(mainWindow);
                                break;
                            case "toggleMenu":
                                registerGlobalShortCutForToggleMenu(mainWindow);
                                break;
                        }
                    });
                }
            });
        });

        return;
    }

    switch (alias) {
        case "clearAll":
            registerGlobalShortCutForClearAll(mainWindow);
            break;
        case "darkMode":
            registerGlobalShortCutForDarkMode(mainWindow);
            break;
        case "alwaysOnTop":
            registerGlobalShortCutForAlwaysOnTop(mainWindow);
            break;
    }
}

/**
 * Configures global shortcuts.
 * @param mainWindow - The BrowserWindow instance.
 */
function configureGlobalShortcut(mainWindow: BrowserWindow): void {
    /**
     * Event listener for the "will-quit" event of the app.
     * Unregisters all global shortcuts when the app is about to quit.
     */

    storage.setDataPath(os.tmpdir());

    /**
     * Event listener for the "global-shortcut:reset" event of ipcMain.
     * Unregisters all global shortcuts.
     */
    ipcMain.on("global-shortcut:unregisterAll", (): void => {
        globalShortcut.unregisterAll();
    });

    ipcMain.on("global-shortcut:registerAll", () => {
        console.log("global-shortcut:registerAll");

        storage.keys((error: Error | null, keys: string[]): void => {
            let shortcuts: Awaited<ShortcutData | null>[] = [];

            const getShortcutData = (key: string): Promise<ShortcutData | null> => {
                return new Promise((resolve, reject) => {
                    if (key.startsWith("ds_shortcut_")) {
                        // @ts-ignore
                        storage.get(key, (error: Error | null, data: ShortcutData): void => {
                            if (error) {
                                reject(error);
                            } else {
                                resolve(data);
                            }
                        });
                    } else {
                        // @ts-ignore
                        resolve({});
                    }
                });
            };

            const retrieveShortcuts = async (): Promise<void> => {
                const promises: Promise<ShortcutData | null>[] = keys.map((key: string) => getShortcutData(key));
                try {
                    shortcuts = await Promise.all(promises);

                    shortcuts.forEach((shortcuts) => {
                        storage.set(shortcuts.shortcut, shortcuts, (error): void => {
                            // eslint-disable-next-line no-console
                            if (error) console.log(error);

                            registerShortcuts(mainWindow, shortcuts.alias);
                        });
                    });
                } catch (error) {
                    // eslint-disable-next-line no-console
                    console.error(error);
                }
            };

            retrieveShortcuts().then();
        });
    });

    /**
     * Event listener for the "global-shortcut:set" event of ipcMain.
     * Sets the specified shortcut data in storage and registers the shortcuts.
     * @param event - The Electron.IpcMainEvent instance.
     * @param data - The shortcut data.
     */
    ipcMain.on("global-shortcut:set", (event: Electron.IpcMainEvent, data): void => {
        storage.set(data.shortcut, data, (error): void => {
            // eslint-disable-next-line no-console
            if (error) console.log(error);

            registerShortcuts(mainWindow, data.alias);
        });
    });

    /**
     * Event listener for the "global-shortcut:get" event of ipcMain.
     * Retrieves all stored shortcuts from storage and sends them to the mainWindow.
     */
    ipcMain.on("global-shortcut:get", (): void => {
        storage.keys((error: Error | null, keys: string[]): void => {
            if (error) {
                // eslint-disable-next-line no-console
                console.error(error);
                return;
            }

            mainWindow.webContents.send("app:global-shortcut::count", keys.length);

            let shortcuts: Awaited<ShortcutData | null>[] = [];

            const getShortcutData = (key: string): Promise<ShortcutData | null> => {
                return new Promise((resolve, reject) => {
                    if (key.startsWith("ds_shortcut_")) {
                        // @ts-ignore
                        storage.get(key, (error: Error | null, data: ShortcutData): void => {
                            if (error) {
                                reject(error);
                            } else {
                                resolve(data);
                            }
                        });
                    } else {
                        // @ts-ignore
                        resolve({});
                    }
                });
            };

            const retrieveShortcuts = async (): Promise<void> => {
                const promises: Promise<ShortcutData | null>[] = keys.map((key: string) => getShortcutData(key));
                try {
                    shortcuts = await Promise.all(promises);
                    mainWindow.webContents.send("app:global-shortcut::list", shortcuts);
                } catch (error) {
                    // eslint-disable-next-line no-console
                    console.error(error);
                }
            };

            retrieveShortcuts().then();
        });
    });
}

export { registerShortcuts, configureGlobalShortcut };
