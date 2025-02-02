import { defineStore } from "pinia";
import { ref } from "vue";
import { Settings } from "@/types/settings.type";

const themeColors = {
    system: "System",
    light: "Light",
    dark: "Dark",
    dracula: "Dracula",
    dim: "Dim",
    retro: "Retro",
    halloween: "Halloween",
    cyberpunk: "Cyberpunk",
    laravel: "Laravel",
    lemonade: "Lemonade",
    winter: "Winter"
};

const languageOptions = {
    en: "English",
    pt_BR: "Português (BR)",
    es_ES: "Español (ES)",
    fa_IR: "فارسی (IR)",
    ar_AR: "عربي (AR)",
    it_IT: "Italiano (IT)",
    zh_CN: "Chinese (CN)",
    id_ID: "Indonesian (ID)",
    al_AL: "Shqip (AL)",
    tr_TR: "Türkçe (TR)"
};

const ideHandlerOptions = {
    "phpstorm://open?file={filepath}&line={line}": "PHPStorm",
    "phpstorm://open?file={wsl_config}{filepath}&line={line}": "PHPStorm WSL",
    "vscode://file/{filepath}:{line}": "VS Code",
    "vscode://vscode-remote/{wsl_config}{filepath}:{line}": "VS Code Remote",
    "vscode-insiders://file/{filepath}:{line}": "VS Code Insiders",
    "subl://open?url=file://{filepath}&line={line}": "Sublime",
    "atom://core/open/file?filename={filepath}&line={line}": "Atom"
};

const checkForUpdateOptions = {
    auto_download: "Automatic",
    manual_download: "Manual Download"
};

const autoLaunchOptions = {
    disabled: "Disabled",
    enabled: "Enabled"
};

const scrollDirection = {
    top: "Top",
    bottom: "Bottom"
};

const dumpOrder = {
    normal: "Normal",
    reversed: "Reversed"
};

export const useSettingsStore = defineStore("settings", () => {
    const themes = ref(themeColors);

    let defaultSettings: Settings = {
        theme: "dark",
        language: "en",
        check_for_updates: "auto_download",
        ide_handler: "phpstorm://open?file={filepath}&line={line}",
        scroll_direction: "todo",
        auto_launch: "disabled",
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
        window_height: 620
    };

    const settings = ref<Settings>(defaultSettings);

    const update = () => {
        const serializablePayload = JSON.parse(JSON.stringify(settings.value));

        // clone settings json
        window.ipcRenderer.send("settings.store", serializablePayload);
    };

    const setSettings = (settings: any) => {
        settings.value = settings;
    };

    return { settings, update, themes, languageOptions, ideHandlerOptions, autoLaunchOptions, dumpOrder, scrollDirection, checkForUpdateOptions, setSettings };
});
