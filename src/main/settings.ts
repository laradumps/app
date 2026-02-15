import { DEFAULT_SETTINGS } from '@/default-settings';
import { Settings, Shortcut } from '@/types/settings.type';
import { app, ipcMain } from 'electron';
import * as fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const homeDir = os.homedir();

/**
 * Resolves the absolute path to the application's configuration directory
 * based on the XDG Base Directory Specification and OS-native standards.
 *
 * * Logic priority:
 *
 * 1. $XDG_CONFIG_HOME/laradumps (if environment variable is set)
 * 2. $HOME/.config/laradumps (Linux/macOS fallback)
 * 3. %APPDATA%\laradumps (Windows standard)
  */
function getConfigDir() {
    const operatingSystem = os.platform();

    if (operatingSystem === 'linux' || operatingSystem === 'darwin') {
        let laradumpsConfigDir = process.env.XDG_CONFIG_HOME;

        // if XDG_CONFIG_HOME does not exist, default to $HOME/.config/laradumps
        if (laradumpsConfigDir === undefined) {
            return path.join(homeDir, '.config', 'laradumps');
        }

        return path.join(laradumpsConfigDir, 'laradumps')
    }

    const winConfig = process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming');

    return path.join(winConfig, 'laradumps');
}

const settingsDir = getConfigDir()
if (app.isPackaged && !fs.existsSync(settingsDir)) {
    fs.mkdirSync(settingsDir, { recursive: true });
}
const settingsPath = app.isPackaged ? path.join(settingsDir, 'settings.json') : path.join(__dirname, 'settings.json');

const defaultSettings = DEFAULT_SETTINGS;

export const init = async () => {
    ipcMain.on('settings.store', async (_event: any, data: Settings) => {
        await setSettings(data);
    });
    ipcMain.on('settings.init-shortcuts', initShortcuts);
    ipcMain.on('settings.clear-shortcuts', clearShortcuts);
};

export const setSettings = async (data: Settings) => {
    fs.writeFileSync(settingsPath, JSON.stringify(data));
};

const clearShortcuts = (event) => {
    const electronLocalShortcut = require('electron-localshortcut');

    for (let key in getSettings().shortcuts) {
        const shortcut: Shortcut = getSettings().shortcuts[key];

        console.log('unregistering ' + key);
        electronLocalShortcut.unregister(shortcut.keys);
    }

    event.reply('app:local-shortcut-clear');
};

export const initShortcuts = (event) => {
    const electronLocalShortcut = require('electron-localshortcut');

    for (let key in getSettings().shortcuts) {
        const shortcut: Shortcut = getSettings().shortcuts[key];

        electronLocalShortcut.register(shortcut.keys, (): void => {
            // eslint-disable-next-line no-console
            console.log('executing ' + key);
            event.reply('app:local-shortcut-execute::' + key);
        });
    }
};
export const getSettings = (): Settings => {
    let settings: Settings = defaultSettings;

    if (fs.existsSync(settingsPath)) {
        try {
            const settingsRaw = fs.readFileSync(settingsPath, 'utf-8');
            settings = { ...defaultSettings, ...JSON.parse(settingsRaw) };
            settings.shortcuts = { ...defaultSettings.shortcuts, ...settings.shortcuts };
        } catch (error) {
            return settings;
        }
    }

    settings.version = app.getVersion();

    setSettings(settings);
    return settings;
};
