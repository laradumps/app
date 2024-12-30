import { BrowserWindow, ipcMain } from "electron";
import { Payload } from "@/types/Payload";
import { createScreenWindow } from "./window/screen";
import { isDev } from "./main";

export const init = async (mainWindow: BrowserWindow, windowsMap) => {
    function sendScreenWindowUpdate(screen: string, payload: Payload) {
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
};
