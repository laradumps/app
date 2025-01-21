import { BrowserWindow, ipcMain } from "electron";
import storage from "electron-json-storage";

const AutoLaunch = require("auto-launch");

const isDev: boolean = process.env.NODE_ENV === "development";

export const init = async () => {
    if (!isDev) {
        const autoLauncher = new AutoLaunch({ name: "LaraDumps" });

        ipcMain.on("set-auto-launch", (event: Electron.IpcMainEvent, arg): void => {
            arg.value === "disabled" ? autoLauncher.disable() : autoLauncher.enable();
        });

        ipcMain.on("set-auto-launch", (event, args) => {
            storage.set(`AutoLaunch`, args, (error: Error | null): void => {
                if (error) {
                    console.error("Error setting storage:", error);
                    return;
                }
            });
        });
    }
};
