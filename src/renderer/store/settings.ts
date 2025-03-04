import { defineStore } from "pinia";
import { ref } from "vue";
import { Settings } from "@/types/settings.type";
import { DEFAULT_SETTINGS } from "@/default-settings";

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
    winter: "Winter",
    forest: "Forest",
    valentine: "Valentine",
    aqua: "Aqua",
    emerald: "Emerald",
    midnight: "Midnight",
    nord: "Nord",
    silk: "Silk",
    luxury: "Luxury",
    cupcake: "Cupcake",
    caramellatte: "Caramel Latte"
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

    const settings = ref<Settings>(DEFAULT_SETTINGS);

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
