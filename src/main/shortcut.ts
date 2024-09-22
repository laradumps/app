import storage from "electron-json-storage";
import os from "os";
import { BrowserWindow, ipcMain } from "electron";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const electronLocalShortcut = require("electron-localshortcut");

interface ShortcutData {
    alias: string;
    keys: string;
}

/**
 * Registers a local shortcut for clearing all data.
 * @param mainWindow - The BrowserWindow instance.
 */
const registerLocalShortCutForClearAll = (mainWindow: BrowserWindow): void => {
    // @ts-ignore
    storage.get("ds_shortcut_clearAll", (error, data: ShortcutData): void => {
        if (error) {
            // eslint-disable-next-line no-console
            console.error(error);
            return;
        }

        if (data?.keys) {
            try {
                electronLocalShortcut.register(data.keys, (): void => {
                    // eslint-disable-next-line no-console
                    console.log("executing clearAll!");
                    mainWindow.webContents.send("app:local-shortcut-execute::clearAll");
                });
            } catch (error) {
                // eslint-disable-next-line no-console
                console.error(`Error registering shortcut: ${error}`);
            }
        }
    });
};

/**
 * Registers a local shortcut for  always on top.
 * @param mainWindow - The BrowserWindow instance.
 */
const registerLocalShortCutForAlwaysOnTop = (mainWindow: BrowserWindow): void => {
    // @ts-ignore
    storage.get("ds_shortcut_alwaysOnTop", (error, data: ShortcutData): void => {
        // eslint-disable-next-line no-console
        if (error) console.error(error);

        if (data.keys.toString() !== "") {
            // @ts-ignore
            electronLocalShortcut.register(data.keys, (): void => {
                // eslint-disable-next-line no-console
                console.log("executing alwaysOnTop!");

                mainWindow.webContents.send("app:local-shortcut-execute::alwaysOnTop");
            });
        }
    });
};

/**
 * Registers a local shortcut for global search.
 * @param mainWindow - The BrowserWindow instance.
 */
const registerLocalShortCutForSearch = (mainWindow: BrowserWindow): void => {
    // @ts-ignore
    storage.get("ds_shortcut_globalSearch", (error, data: ShortcutData): void => {
        // eslint-disable-next-line no-console
        if (error) console.error(error);

        if (data.keys.toString() !== "") {
            // @ts-ignore
            electronLocalShortcut.register(data.keys, (): void => {
                // eslint-disable-next-line no-console
                console.log("executing globalSearch!");

                mainWindow.webContents.send("app:local-shortcut-execute::globalSearch");
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
                                registerLocalShortCutForClearAll(mainWindow);
                                break;
                            case "alwaysOnTop":
                                registerLocalShortCutForAlwaysOnTop(mainWindow);
                                break;
                            case "globalSearch":
                                registerLocalShortCutForSearch(mainWindow);
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
            registerLocalShortCutForClearAll(mainWindow);
            break;
        case "alwaysOnTop":
            registerLocalShortCutForAlwaysOnTop(mainWindow);
            break;
    }
}

/**
 * Configures local shortcuts.
 * @param mainWindow - The BrowserWindow instance.
 */
function configureLocalShortcut(mainWindow: BrowserWindow): void {
    /**
     * Event listener for the "will-quit" event of the app.
     * Unregisters all global shortcuts when the app is about to quit.
     */

    ipcMain.on("local-shortcut:registerAll", () => {
        console.log("local-shortcut:registerAll");

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
     * Event listener for the "local-shortcut:set" event of ipcMain.
     * Sets the specified shortcut data in storage and registers the shortcuts.
     * @param event - The Electron.IpcMainEvent instance.
     * @param data - The shortcut data.
     */
    ipcMain.on("local-shortcut:set", (event: Electron.IpcMainEvent, data): void => {
        storage.set(data.shortcut, data, (error): void => {
            // eslint-disable-next-line no-console
            if (error) console.log(error);

            registerShortcuts(mainWindow, data.alias);
        });
    });

    /**
     * Event listener for the "local-shortcut:get" event of ipcMain.
     * Retrieves all stored shortcuts from storage and sends them to the mainWindow.
     */
    ipcMain.on("local-shortcut:get", (): void => {
        storage.keys((error: Error | null, keys: string[]): void => {
            if (error) {
                // eslint-disable-next-line no-console
                console.error(error);
                return;
            }

            mainWindow.webContents.send("app:local-shortcut::count", keys.length);

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
                        resolve(null);
                    }
                });
            };

            const retrieveShortcuts = async (): Promise<void> => {
                const promises: Promise<ShortcutData | null>[] = keys.map((key: string) => getShortcutData(key));
                try {
                    shortcuts = await Promise.all(promises);

                    const filteredShortcuts = shortcuts.filter(shortcut => shortcut && Object.keys(shortcut).length > 0);

                    mainWindow.webContents.send("app:local-shortcut::list", filteredShortcuts);
                } catch (error) {
                    // eslint-disable-next-line no-console
                    console.error(error);
                }
            };

            retrieveShortcuts().then();
        });
    });

}

export { registerShortcuts, configureLocalShortcut };
