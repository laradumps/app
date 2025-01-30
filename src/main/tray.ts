import { app, BrowserWindow, Menu, nativeImage, Tray } from "electron";
import path from "path";

let tray: Electron.Tray;
const isMac: boolean = process.platform === "darwin";

export const init = async (window: BrowserWindow) => {
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
                label: "Exit",
                accelerator: "Command+Q",
                click: async (): Promise<void> => {
                    app.quit();
                }
            }
        ]);

        tray.setToolTip("LaraDumps");

        tray.on("click", () => {
            tray.setContextMenu(null);
            if (!window.isVisible()) {
                window.show();
            }
        });

        tray.on("right-click", () => {
            tray.setContextMenu(contextMenu);
            tray.popUpContextMenu();
        });
    }
};
