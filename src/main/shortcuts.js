import storage from 'electron-json-storage';
import os from 'os';
import { app, BrowserWindow, globalShortcut } from 'electron';
import { join, resolve } from 'path';
import { format } from 'url';

const isDev = process.env.NODE_ENV === 'development';

function registerShortcuts() {
    storage.setDataPath(os.tmpdir());

    globalShortcut.unregisterAll();

    /* ====================================
       =          Configurable           =
       =================================== */

    let foobar = storage.getSync('ds_shortcut_foobar');

    if (Object.keys(foobar).length === 0) {
        foobar = { shortcut: 'foobar', keys: 'CommandOrControl+Shift+O' };
    }

    // eslint-disable-next-line no-console
    console.log(`Setting shortcut foobar to: ${foobar.keys}`);

    if (foobar.keys.length > 0) {
        globalShortcut.register(foobar.keys, () => {
            console.log('executing foobar!');
        });
    }
}

function showShortcutsWindow() {
    storage.setDataPath(os.tmpdir());

    const shortcutsWindowOptions = {
        width: 800,
        height: 800,
        alwaysOnTop: true,
        resizable: false,
        frame: false,
        show: false,
        webPreferences: {
            spellcheck: true,
            nodeIntegration: true,
            contextIsolation: false,
        },
    };

    if ((process.platform === 'linux' && !isDev) || isDev) {
        shortcutsWindowOptions.icon = resolve(__dirname, 'icon.png');
    }

    const shortcutsWindow = new BrowserWindow(shortcutsWindowOptions);
    shortcutsWindow.setMenu(null);

    if (isDev) {
        shortcutsWindow.loadURL('http://localhost:4999/shortcuts.html');
    } else {
        shortcutsWindow.loadURL(
            format({
                pathname: join(__dirname, 'app', 'shortcuts.html'),
                protocol: 'file:',
                slashes: true,
            }),
        );
    }

    // Sending configured shortcuts
    storage.keys((error, keys) => {
        if (error) throw error;
        keys.forEach((key) => {
            if (key.startsWith('ds_shortcut_')) {
                storage.get(key, (error, data) => {
                    shortcutsWindow.webContents.on('did-finish-load', () => {
                        shortcutsWindow.webContents.send('shortcuts:list', data);
                    });
                });
            }
        });
    });

    return shortcutsWindow;
}

export { registerShortcuts, showShortcutsWindow };
