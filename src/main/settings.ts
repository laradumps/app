import path from "path";
import * as fs from "node:fs";
import { app, ipcMain } from "electron";
import os from "os";
import { Settings, Shortcut } from "@/types/settings.type";
import { DEFAULT_SETTINGS } from "@/default-settings";

const homeDir = os.homedir();

const settingsDir = path.join(homeDir, ".laradumps");
if (app.isPackaged && !fs.existsSync(settingsDir)) {
    fs.mkdirSync(settingsDir, { recursive: true });
}

const settingsPath = app.isPackaged ? path.join(settingsDir, "settings.json") : path.join(__dirname, "settings.json");

const defaultSettings = DEFAULT_SETTINGS

export const init = async () => {
    ipcMain.on("settings.store", async (_event: any, data: Settings) => {
        await setSettings(data);
    });
    ipcMain.on("settings.init-shortcuts", initShortcuts);
};

export const setSettings = async (data: Settings) => {
    fs.writeFileSync(settingsPath, JSON.stringify(data));
};

export const initShortcuts = (event) => {
    const electronLocalShortcut = require("electron-localshortcut");

    for (let key in getSettings().shortcuts) {
        const shortcut: Shortcut = getSettings().shortcuts[key];

        electronLocalShortcut.register(shortcut.keys, (): void => {
            // eslint-disable-next-line no-console
            console.log("executing " + key);
            event.reply("app:local-shortcut-execute::" + key);
        });
    }
};
export const getSettings = (): Settings => {
    let settings: Settings = defaultSettings;

    if (fs.existsSync(settingsPath)) {
        try {
            const settingsRaw = fs.readFileSync(settingsPath, "utf-8");
            settings = { ...defaultSettings, ...JSON.parse(settingsRaw) };
            settings.shortcuts = { ...defaultSettings.shortcuts, ...settings.shortcuts };
        } catch (error) {
            return settings;
        }
    }

    setSettings(settings);
    return settings;
};

