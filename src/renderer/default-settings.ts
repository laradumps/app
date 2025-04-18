import { Settings } from "@/types/settings.type";

export const DEFAULT_SETTINGS: Settings = {
    version: "",
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
    show_variable_type: true,
    limit_dumps: 100,
    limit_laravel_queries: 150,
    limit_laravel_logs: 150,
    limit_laravel_jobs: 150,
    custom_css: "",
    show_badge_count: true,
};
