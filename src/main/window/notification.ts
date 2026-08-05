import { BrowserWindow, ipcMain, screen } from 'electron';
import { join, resolve } from 'path';
import { format } from 'url';
import { getTrayBounds } from '../tray';
import * as settings from '../settings';

const isDev = process.env.NODE_ENV === 'development';

const WINDOW_WIDTH = 380;
const INITIAL_HEIGHT = 120;
const MAX_HEIGHT = 360;
const MAX_ITEMS = 3;
const TRAY_GAP = 4;

let notificationWindow: BrowserWindow | null = null;
let mainWindowRef: BrowserWindow | null = null;
let items: unknown[] = [];

const positionWindow = (win: BrowserWindow, height: number): void => {
    const bounds = getTrayBounds();

    if (bounds && bounds.width > 0) {
        const display = screen.getDisplayNearestPoint({ x: bounds.x, y: bounds.y });
        const workArea = display.workArea;

        let x = Math.round(bounds.x + bounds.width / 2 - WINDOW_WIDTH / 2);
        x = Math.max(workArea.x, Math.min(x, workArea.x + workArea.width - WINDOW_WIDTH));

        const y = Math.round(bounds.y + bounds.height + TRAY_GAP);

        win.setBounds({ x, y, width: WINDOW_WIDTH, height });
        return;
    }

    // Fallback: top-right corner of the primary display's work area.
    const workArea = screen.getPrimaryDisplay().workArea;
    win.setBounds({
        x: workArea.x + workArea.width - WINDOW_WIDTH - TRAY_GAP,
        y: workArea.y + TRAY_GAP,
        width: WINDOW_WIDTH,
        height
    });
};

const sendItems = (win: BrowserWindow): void => {
    if (win.isDestroyed()) return;

    const push = () => {
        if (!win.isDestroyed()) {
            win.webContents.send('notification:items', items);
        }
    };

    if (win.webContents.isLoading()) {
        win.webContents.once('did-finish-load', push);
    } else {
        push();
    }
};

const isMainWindowVisible = (): boolean => {
    return !!mainWindowRef && !mainWindowRef.isDestroyed() && mainWindowRef.isVisible();
};

const dismiss = (): void => {
    items = [];
    if (notificationWindow && !notificationWindow.isDestroyed()) {
        notificationWindow.hide();
    }
};

const createWindow = (): BrowserWindow => {
    const win = new BrowserWindow({
        width: WINDOW_WIDTH,
        height: INITIAL_HEIGHT,
        show: false,
        frame: false,
        resizable: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        fullscreenable: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            preload: resolve(__dirname, 'global-ipc-renderer.cjs')
        }
    });

    win.setMenu(null);

    const qs = 'notification=1';
    win.loadURL(
        isDev
            ? `http://localhost:4999?${qs}`
            : format({
                  pathname: join(__dirname, 'app', 'index.html'),
                  protocol: 'file:',
                  slashes: true
              }) + `?${qs}`
    );

    win.webContents.on('did-finish-load', () => {
        if (!win.isDestroyed()) {
            win.webContents.send('init.reply', {
                settings: settings.getSettings(),
                blurActive: false
            });
        }
    });

    win.on('closed', () => {
        notificationWindow = null;
    });

    return win;
};

export const init = async (mainWindow: BrowserWindow): Promise<void> => {
    mainWindowRef = mainWindow;

    mainWindow.on('show', () => {
        dismiss();
    });

    // Renderer signals it has mounted and registered its listener; replay the current buffer so the
    // first dump is never lost to a load race.
    ipcMain.on('notification:ready', () => {
        if (notificationWindow && !notificationWindow.isDestroyed()) {
            sendItems(notificationWindow);
        }
    });

    ipcMain.on('notification:close', () => {
        dismiss();
    });

    ipcMain.on('notification:open-main', () => {
        if (mainWindowRef && !mainWindowRef.isDestroyed()) {
            if (!mainWindowRef.isVisible()) {
                mainWindowRef.show();
            }
            mainWindowRef.focus();
        }
    });

    ipcMain.on('notification:resize', (_event, height: number) => {
        if (notificationWindow && !notificationWindow.isDestroyed()) {
            const clamped = Math.min(MAX_HEIGHT, Math.max(INITIAL_HEIGHT, Math.round(height)));
            positionWindow(notificationWindow, clamped);
        }
    });
};

export const push = (arg: { content: unknown }): void => {
    if (isMainWindowVisible()) {
        return;
    }

    items.unshift(arg.content);
    items = items.slice(0, MAX_ITEMS);

    if (!notificationWindow || notificationWindow.isDestroyed()) {
        notificationWindow = createWindow();
    }

    const win = notificationWindow;

    positionWindow(win, win.getBounds().height || INITIAL_HEIGHT);
    win.showInactive();
    sendItems(win);
};
