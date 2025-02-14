import path from "path";
import * as fs from "node:fs";
import { app, ipcMain } from "electron";
import os from "os";
import { Settings, Shortcut } from "@/types/settings.type";

const homeDir = os.homedir();

const settingsDir = path.join(homeDir, ".laradumps");
if (app.isPackaged && !fs.existsSync(settingsDir)) {
    fs.mkdirSync(settingsDir, { recursive: true });
}

const settingsPath = app.isPackaged ? path.join(settingsDir, "settings.json") : path.join(__dirname, "settings.json");

const defaultSettings: Settings = {
    theme: "dark",
    language: "en",
    check_for_updates: "auto_download",
    ide_handler: "phpstorm://open?file={filepath}&line={line}",
    auto_launch: "disabled",
    scroll_direction: "top",
    dump_order: "normal",
    shortcuts: {
        always_on_top: {
            originalValue: process.platform === "darwin" ? "⌥+⇧+T" : "Ctrl+Shift+T",
            keys: process.platform === "darwin" ? "Alt+Shift+T" : "Ctrl+Shift+T",
            label: "settings.shortcut.alwaysOnTop"
        },
        clear_all: {
            originalValue: process.platform === "darwin" ? "⌥+⇧+K" : "Ctrl+Shift+K",
            keys: process.platform === "darwin" ? "Alt+Shift+K" : "Ctrl+Shift+K",
            label: "settings.shortcut.clear"
        }
    },
    window_width: 760,
    window_height: 620,
    show_ssh_button: true,
    show_collapse_button: false,
    show_pause_button: false,
    show_variable_type: true
};

export const init = async () => {
    ipcMain.on("settings.store", async (_event: any, data: Settings) => {
        setSettings(data);
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

export const getSettings = () => {
    let settingsRaw: string = "";
    let settings: Settings;

    if (fs.existsSync(settingsPath)) {
        settingsRaw = fs.readFileSync(settingsPath).toString();
    }

    if (settingsRaw) {
        settings = JSON.parse(settingsRaw);
    } else {
        settings = defaultSettings;
        setSettings(settings);
    }

    return settings;
};
