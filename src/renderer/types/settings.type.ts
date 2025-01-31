export interface Shortcut {
    label: string;
    originalValue: string;
    keys: string;
}

export interface Shortcuts {
    clear_all: Shortcut;
    always_on_top: Shortcut;
}

export interface Settings {
    theme: string;
    language: string;
    check_for_updates: string;
    auto_launch: string;
    scroll_direction: string;
    ide_handler: string;
    shortcuts: Shortcuts;
    dump_order: "normal" | "reversed";
}
