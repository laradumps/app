import { BrowserWindow, ipcMain } from "electron";
import { isDev } from "./main";

const AutoLaunch = require("auto-launch");

export const init = async (mainWindow: BrowserWindow) => {
    if (!isDev) {
        const autoLauncher = new AutoLaunch({ name: "LaraDumps" });

        ipcMain.on("main-menu:set-auto-launch", (event: Electron.IpcMainEvent, arg): void => {
            arg.value === "disabled" ? autoLauncher.disable() : autoLauncher.enable();
        });
    }
};
