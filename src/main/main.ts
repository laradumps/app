import {
    app,
    nativeTheme,
    BrowserWindow,
    Menu,
    BrowserWindowConstructorOptions,
    dialog,
    ipcMain,
    shell
} from 'electron';
import { autoUpdater } from 'electron-updater';
import { download } from 'electron-dl';
import { selectProjectDirectory } from './project-setup';

import path, { join, resolve } from 'path';
import fs from 'fs';
import * as ssh from './ssh';

import storage from 'electron-json-storage';
import './watcher';
import './ipc';

import * as electronStore from './storage';
import * as electronAutoUpdate from './auto-update';
import * as electronTray from './tray';
import * as customWindow from './custom-window';
import * as electronAutoLaunch from './auto-launch';
import * as settings from './settings';
import * as xdebug from './xdebug';
import * as mcpManager from './mcp-manager';

import { CompletedInfo } from '@/types/Updater';
import { createMenu } from './main-menu';
import { createScreenWindow } from './window/screen';
import { format } from 'url';

const isDev: boolean = process.env.NODE_ENV === 'development';
const isMac: boolean = process.platform === 'darwin';

let mainWindow: BrowserWindow;
let badgeCount = 0;
const windowsMap = new Map();
let downloadCompleted = false;

const electronLocalShortcut = require('electron-localshortcut');

function createWindow(): BrowserWindow {
    const browserWindowOptions: BrowserWindowConstructorOptions = {
        fullscreen: false,
        fullscreenable: false,
        width: settings.getSettings().window_width,
        height: settings.getSettings().window_height,
        resizable: true,
        alwaysOnTop: false,
        center: true,
        titleBarStyle: 'hiddenInset',
        webPreferences: {
            contextIsolation: false,
            preload: resolve(__dirname, 'preload.cjs'),
            nodeIntegration: true
        },
        show: false,
        icon: path.join(__dirname, 'icon.png')
    };

    if (process.platform === 'linux' && !isDev) {
        browserWindowOptions.icon = resolve(__dirname, 'icon.png');
    }

    if (isMac) {
        browserWindowOptions.trafficLightPosition = { x: 12, y: 11 };
    }

    const window: BrowserWindow = new BrowserWindow(browserWindowOptions);

    window.setMenuBarVisibility(false);

    window.loadURL(
        isDev
            ? `http://localhost:4999?screen=default`
            : format({
                  pathname: join(__dirname, 'app', 'index.html'),
                  protocol: 'file:',
                  slashes: true
              }) + `?screen=default`
    );

    window.on('resize', (): void => {
        const [width, height] = window.getSize();
        settings.setSettings({
            ...settings.getSettings(),
            window_width: width,
            window_height: height
        });
    });

    window.webContents.on('did-finish-load', async () => {
        try {
            window.webContents.send('init.reply', {
                settings: settings.getSettings()
            });

            window.show();
        } catch (error) {}
    });

    !isDev && electronAutoUpdate.init(window);

    electronLocalShortcut.register('CommandOrControl+Shift+X', (): void => {
        mainWindow.webContents.send('xdebug-connector::disconnect');
        mainWindow.reload();
    });

    window.once('ready-to-show', (): void => {
        window.show();
        window.focus();

        if (isDev) {
            setTimeout(() => {
                window.webContents.openDevTools();
            }, 400);
        }
    });

    return window;
}

ipcMain.on('dump', (event: Electron.IpcMainEvent, arg): void => {
    event.sender.send(arg.type, arg);
});

ipcMain.on('badge-icon.decrement', (_: Electron.IpcMainEvent, args): void => {
    if (badgeCount > 0) {
        badgeCount -= 1;
    }

    setBadgeCount(badgeCount);
});

ipcMain.on('badge-icon.increment', (_: Electron.IpcMainEvent, args): void => {
    if (args && args.reset) {
        badgeCount = 0;
    } else {
        badgeCount += 1;
    }

    setBadgeCount(badgeCount);
});

ipcMain.on('dump.batches', (event: Electron.IpcMainEvent, arg): void => {
    mainWindow.webContents.send('new.dumps');
    event.sender.send('dump.batches', arg);
});

function setBadgeCount(count: number): void {
    try {
        app.setBadgeCount(badgeCount);
    } catch (error) {
        console.error('Error setting app badge:', error);
    }
}
function sendScreenWindowUpdate(screen, payload, jobs, mails, logs, queries) {
    const screenWindow = windowsMap.get(screen);
    try {
        if (screenWindow && !screenWindow.isDestroyed() && screenWindow.webContents) {
            screenWindow.webContents.send('app:screen-window-update', {
                payload,
                jobs,
                mails,
                logs,
                queries
            });
        }
    } catch (e) {}
}

ipcMain.on('send-screen-window-update', (event, args) => {
    const payload = args.payload;
    const jobs = args.jobs;
    const mails = args.mails;
    const logs = args.logs;
    const queries = args.queries;

    sendScreenWindowUpdate(args.screen, payload, jobs, mails, logs, queries);
});

// Relay saved-dumps removal requests from any renderer to the main window (HomeView listener)
ipcMain.on('saved-dumps:remove', (event, args) => {
    try {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('saved-dumps:remove', args);
        }
    } catch (e) {
        console.warn('Failed to relay saved-dumps:remove', String(e));
    }
});

ipcMain.on('reload', () => {
    mainWindow.webContents.send('xdebug-connector::disconnect');
    setBadgeCount(0);
    mainWindow.reload();
});

ipcMain.on('screen-window:show', (event, arg) => {
    let screenWindow: BrowserWindow;
    const screenExist = windowsMap.has(arg.screen);

    if (!screenExist) {
        screenWindow = createScreenWindow(mainWindow, arg.screen);
        if (arg.position.length > 0) {
            !screenWindow.isDestroyed() && screenWindow.setPosition(arg.position.x, arg.position.y);
        } else {
            const { screen } = require('electron');
            const displays = screen.getAllDisplays();
            const externalDisplay = displays.find((d) => d.id !== screen.getPrimaryDisplay().id);

            if (externalDisplay) {
                const { x, y, width, height } = externalDisplay.bounds;
                const windowWidth = 670;
                const windowHeight = 660;
                const newX = x + (width - windowWidth) / 2;
                const newY = y + (height - windowHeight) / 2;
                !screenWindow.isDestroyed() &&
                    screenWindow.setBounds({ x: newX, y: newY, width: windowWidth, height: windowHeight });
            } else {
                !screenWindow.isDestroyed() && screenWindow.center();
            }
        }
    } else {
        screenWindow = windowsMap.get(arg.screen);
        if (!screenWindow || screenWindow.isDestroyed()) {
            screenWindow = createScreenWindow(mainWindow, arg.screen);
        }
    }

    if (!screenWindow.isDestroyed() && !screenWindow.isVisible()) {
        screenWindow.show();
    }

    if (!screenWindow.isDestroyed() && isDev) {
        screenWindow.webContents.openDevTools();
    }

    windowsMap.set(arg.screen, screenWindow);

    const sendEnableMessage = () => {
        if (!screenWindow.isDestroyed()) {
            screenWindow.webContents.send('app:screen-window-enable', {
                screen: arg.screen,
                payload: arg.payload,
                jobs: arg.jobs || {},
                mails: arg.mails || {},
                logs: arg.logs || {},
                queries: arg.queries || {}
            });
        }
    };

    if (!screenWindow.isDestroyed()) {
        screenExist ? sendEnableMessage() : screenWindow.webContents.once('did-finish-load', () => sendEnableMessage());
    }

    screenWindow.on('closed', () => {
        windowsMap.delete(arg.screen);
    });
});

app.whenReady().then(async (): Promise<void> => {
    mainWindow = createWindow();

    await xdebug.init(mainWindow);
    await settings.init();
    await customWindow.init();
    await electronAutoLaunch.init();
    await electronStore.init();
    await ssh.init();
    await mcpManager.init();

    await createMenu();

    mainWindow.on('minimize', (event: Event): void => {
        event.preventDefault();
        if (isMac) {
            mainWindow.hide();
        }
    });

    mainWindow.on('restore', () => {
        mainWindow.show();
    });

    // @ts-ignore
    mainWindow.on('close', function (): void {
        mainWindow.webContents.send('server:close', {});
    });

    mainWindow.on('closed', (): void => {
        mcpManager.stopMcpServer();
        app.exit(0);
    });

    await autoUpdater.checkForUpdates();

    const userDataPath = app.getPath('userData');

    storage.setDataPath(path.join(userDataPath, 'storage'));

    await electronTray.init(mainWindow);
});

app.on('window-all-closed', (): void => {
    app.quit();
});

app.on('activate', (): void => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

ipcMain.on('main:get-ide-handler', (): void => {
    const jsonFilePath = path.join(app.getAppPath(), './src/renderer/ide-handle-support.json');

    fs.readFile(jsonFilePath, 'utf8', (err, data) => {
        if (err) {
            // eslint-disable-next-line no-console
            console.error('An error occurred while reading the JSON file:', err);
            return;
        }

        const parsedData = JSON.parse(data);

        mainWindow.webContents.send('app:ide-handler', parsedData);
    });
});

ipcMain.on('mail-preview::show-context-menu', (event) => {
    const template = [
        {
            label: 'Inspect',
            click: () => {
                const win = BrowserWindow.fromWebContents(event.sender);
                if (win) {
                    win.webContents.openDevTools();
                }
            }
        }
    ];
    const menu = Menu.buildFromTemplate(template);
    menu.popup({ window: BrowserWindow.fromWebContents(event.sender) });
});

ipcMain.on('main:create-static-tmp-file', (event, value) => {
    mainWindow.webContents.send('preload:create-static-tmp-file', value);
});

ipcMain.on('main:update-zoom-level', (event, value): void => {
    // @ts-ignore
    storage.set('zoomLevel', { value: value });
});

ipcMain.on('get-icon', (event, args) => {
    event.reply('icon', resolve(__dirname, 'icon.png'));
});

ipcMain.on('zoom-level', (): void => {
    let zoomFactor = 1.0;

    const storageZoomValue = () => storage.getSync('zoomLevel');

    // @ts-ignore
    if (storageZoomValue().value > 0) {
        // @ts-ignore
        zoomFactor = storageZoomValue().value;
    }

    mainWindow.webContents.send('zoom-level.reply', zoomFactor);
});

ipcMain.on('main:openLink', (event: Electron.IpcMainEvent, url: any): void => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    shell.openExternal(url).then((): void => {});
});

ipcMain.on('main:toggle-always-on-top', (event, arg) => {
    setTimeout(() => mainWindow.setAlwaysOnTop(arg), 200);
});

ipcMain.on('main:is-always-on-top', (event): void => {
    event.reply('main:is-always-on-top', { is_always_on_top: mainWindow.isAlwaysOnTop() });
});

ipcMain.on('main:app-version', (event): void => {
    event.reply('main:app-version.reply', { version: app.getVersion() });
});

ipcMain.on('main:show', (): void => {
    mainWindow.show();
});

ipcMain.on('main:dialog', async (event, arg): void => {
    const choice = dialog.showMessageBoxSync(mainWindow, {
        type: 'question',
        buttons: arg.buttons,
        title: arg.title,
        message: arg.message
    });

    await mainWindow.webContents.send('main:dialog-choice', choice);
});

ipcMain.on('main:download-progress-info', async (event, args) => {
    const properties: any = {
        onProgress: (progress: number) => {
            mainWindow.webContents.send('autoUpdater:download-progress', progress);
        },
        onCompleted: (item: CompletedInfo) => {
            if (downloadCompleted) {
                console.log('Download already completed, skipping duplicate event.');
                return;
            }
            downloadCompleted = true;
            mainWindow.webContents.send('autoUpdater:download-complete', item);
        }
    };

    await download(mainWindow, args, properties);
});

ipcMain.on('main:check-upload', async (): Promise<void> => {
    if (!isMac) {
        await autoUpdater.downloadUpdate();
    } else {
        await shell.openExternal('https://github.com/laradumps/app/releases/latest');
    }
});

ipcMain.on('main:download-complete', async (event, args) => {
    const result = await dialog.showMessageBox({
        type: 'info',
        title: 'Update completed!',
        message: 'The download was completed successfully!, do you want to install now?',
        buttons: ['Yes', 'No']
    });

    if (result.response === 0) {
        await shell.openPath(args);

        setTimeout(() => app.quit(), 1000);
    }
});

ipcMain.on('native-theme', () => {
    mainWindow.webContents.send(nativeTheme.shouldUseDarkColors ? 'app:theme-dark' : 'app:theme-light');
});

nativeTheme.on('updated', () => {
    mainWindow.webContents.send(nativeTheme.shouldUseDarkColors ? 'app:theme-dark' : 'app:theme-light');
});

ipcMain.on('platform', (event, args) => {
    event.reply('platform.reply', process.platform);
});

ipcMain.on('choose-file', async (event) => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile']
    });

    if (!result.canceled && result.filePaths.length > 0) {
        event.sender.send('choose-file-response', result.filePaths[0]);
    }
});

ipcMain.on('main:project-setup', async (event, args) => {
    await selectProjectDirectory(mainWindow, event, args);
});
