import path from 'path';
import { app, BrowserWindow, ipcMain, Menu, nativeImage, Tray } from 'electron';
import { isMac } from './main';
import { deepClone } from '@/lib/deep_clone';

let tray: Electron.Tray;

export const init = async (mainWindow: BrowserWindow) => {
    if (isMac) {
        const iconPath: string = path.join(app.getAppPath(), 'src/img/icon@2x.png');
        let trayIcon: Electron.NativeImage = nativeImage.createFromPath(iconPath);

        trayIcon = trayIcon.resize({
            width: 16,
            height: 16
        });

        tray = new Tray(trayIcon);

        tray.setToolTip('LaraDumps');

        let options: { [key: string]: boolean } = {};
        let projectName: string;

        function toSnakeCase(str: string): string {
            return str
                .replace(/([a-z])([A-Z])/g, '$1_$2')
                .replace(/\s+/g, '_')
                .toLowerCase();
        }

        function createMenuItem(label: string, selected: boolean) {
            return {
                label: label,
                type: 'checkbox',
                checked: selected,
                click: () => {
                    options[toSnakeCase(label)] = !options[toSnakeCase(label)];

                    const selectedOptions = Object.entries(options).map(([key, value]) => ({
                        value: toSnakeCase(key),
                        selected: value
                    }));

                    tray.setContextMenu(buildContextMenu());
                    mainWindow.webContents.send('main:tray-updated-environment-options', deepClone(selectedOptions));
                }
            } as MenuItem;
        }

        function capitalizeLabel(label: string): string {
            return label
                .split('_')
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
        }

        function buildContextMenu(): Menu {
            const menuTemplate: (MenuItem | { type: 'separator' })[] = [
                {
                    label: projectName ?? 'Observers',
                    enabled: false
                } as MenuItem,
                { type: 'separator' },
                ...Object.entries(options).map(([label, selected]) => createMenuItem(capitalizeLabel(label), selected)),
                { type: 'separator' },
                {
                    label: 'Exit',
                    click: () => {
                        app.quit();
                    }
                } as MenuItem
            ];

            return Menu.buildFromTemplate(menuTemplate);
        }

        tray.on('click', (event, bounds) => {
            const { x, y } = bounds;
            tray.popUpContextMenu(buildContextMenu(), { x, y });
        });

        ipcMain.on('main:tray-update-context-menu', (event, args) => {
            console.log(args.environmentYmlList);
            options = args.environmentYmlList?.reduce(
                (acc, { value, selected }) => {
                    acc[value] = selected;
                    return acc;
                },
                {} as { [key: string]: boolean }
            );

            projectName = args.projectName;

            tray.setContextMenu(buildContextMenu());
        });
    }
};
