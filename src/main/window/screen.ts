import { app, BrowserWindow, BrowserWindowConstructorOptions, ipcMain } from 'electron';
import { join, resolve } from 'path';
import { format } from 'url';
import * as settings from '../settings';

const isDev = process.env.NODE_ENV === 'development';
const isMac: boolean = process.platform === 'darwin';

let screenWindowOptions: BrowserWindowConstructorOptions;

const createScreenWindow = (mainEvent: BrowserWindow, screen: String) => {
    screenWindowOptions = {
        width: 670,
        height: 660,
        show: false,
        resizable: true,
        alwaysOnTop: true,
        titleBarStyle: 'hiddenInset',
        webPreferences: {
            spellcheck: true,
            nodeIntegration: true,
            preload: resolve(__dirname, 'global-ipc-renderer.cjs'),
            contextIsolation: false
        }
    };

    if ((process.platform === 'linux' && !isDev) || isDev) {
        screenWindowOptions.icon = resolve(__dirname, 'icon.png');
    }

    if (isMac) {
        screenWindowOptions.trafficLightPosition = { x: 12, y: 11 };
    }

    const blurActive = !!settings.getSettings().window_blur && (isMac || process.platform === 'win32');
    if (blurActive) {
        screenWindowOptions.backgroundColor = '#00000000';
        if (isMac) {
            const validModes: BrowserWindowConstructorOptions['vibrancy'][] = [
                'fullscreen-ui',
                'hud',
                'sidebar',
                'under-window'
            ];
            const stored = settings.getSettings().window_blur_mode as BrowserWindowConstructorOptions['vibrancy'];
            screenWindowOptions.vibrancy = validModes.includes(stored) ? stored : 'hud';
            screenWindowOptions.visualEffectState = 'active';
        } else {
            screenWindowOptions.backgroundMaterial = 'acrylic';
        }
    }

    const window = new BrowserWindow(screenWindowOptions);

    window.setMenu(null);

    const qs = `screen=${screen}${blurActive ? '&blur=1' : ''}`;
    window.loadURL(
        isDev
            ? `http://localhost:4999?${qs}`
            : format({
                  pathname: join(__dirname, 'app', 'index.html'),
                  protocol: 'file:',
                  slashes: true
              }) + `?${qs}`
    );

    window.on('closed', () => {
        if (!mainEvent.isDestroyed()) {
            mainEvent.webContents.send('screen-window:closed', { screen });
        }
    });

    ipcMain.on('screen-window:toggle-always-on-top', (event, arg) => {
        if (!window.isDestroyed()) {
            setTimeout(() => window.setAlwaysOnTop(arg), 200);
        }
    });

    ipcMain.on('screen-window:is-always-on-top', (): void => {
        if (!window.isDestroyed()) {
            window.webContents.send('screen-window:is-always-on-top', { is_always_on_top: window.isAlwaysOnTop() });
        }
    });

    return window;
};

export { createScreenWindow };
