import { BrowserWindow, ipcMain } from "electron";
import { Payload } from "@/types/Payload";
import { createScreenWindow } from "./window/screen";
import { isDev } from "./main";

export const init = async (mainWindow: BrowserWindow, windowsMap) => {
    function sendScreenWindowUpdate(screen: string, payload: Payload, jobs: any, mails: any, logs: any) {
        const screenWindow = windowsMap.get(screen);
        if (screenWindow && screenWindow.webContents) {
            screenWindow.webContents.send("app:screen-window-update", {
                payload,
                jobs,
                mails,
                logs
            });
        }
    }

    ipcMain.on("send-screen-window-update", (event, args) => {
        const payload = args.payload;
        const jobs = args.jobs;
        const mails = args.mails;
        const logs = args.logs;

        sendScreenWindowUpdate(args.screen, payload, jobs, mails, logs);
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
                payload: arg.payload,
                jobs: arg.jobs,
                mails: arg.mails,
                logs: arg.logs
            });
        };

        screenExist ? sendEnableMessage() : screenWindow.webContents.once("did-finish-load", () => sendEnableMessage());

        screenWindow.on("closed", () => {
            windowsMap.delete(arg.screen);
        });
    });
};
