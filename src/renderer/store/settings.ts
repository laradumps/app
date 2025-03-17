import { defineStore } from "pinia";
import { ref, watch } from "vue";
import { Settings } from "@/types/settings.type";
import { DEFAULT_SETTINGS } from "@/default-settings";
import { deepClone } from "@/lib/deep_clone";

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
    caramellatte: "Caramel Latte",
    custom: "Custom"
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

    const savedSettings = localStorage.getItem("user-settings");
    const settings = ref<Settings>(savedSettings ? JSON.parse(savedSettings) : DEFAULT_SETTINGS);

    const update = () => {
        const serializablePayload = deepClone(settings.value);

        localStorage.setItem("user-settings", JSON.stringify(serializablePayload));

        window.ipcRenderer.send("settings.store", serializablePayload);
    };

    const setSettings = (newSettings: any) => {
        settings.value = newSettings;
        localStorage.setItem("user-settings", JSON.stringify(newSettings));
    };

    watch(
        () => settings.value.theme,
        (newTheme) => {
            localStorage.setItem("user-settings", JSON.stringify(settings.value));
            document.documentElement.setAttribute("data-theme", newTheme);
        }
    );

    return {
        settings,
        update,
        themes,
        languageOptions,
        ideHandlerOptions,
        autoLaunchOptions,
        dumpOrder,
        scrollDirection,
        checkForUpdateOptions,
        setSettings
    };
});
