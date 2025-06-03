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
    version: string;
    theme: string;
    language: string;
    check_for_updates: string;
    auto_launch: string;
    scroll_direction: "top" | "bottom";
    ide_handler: string;
    shortcuts: Shortcuts;
    dump_order: "normal" | "reversed";
    window_width: number;
    window_height: number;
    show_collapse_button: boolean;
    show_pause_button: boolean;
    show_ssh_button: boolean;
    show_variable_type: boolean;
    limit_dumps: number;
    limit_laravel_queries: number;
    limit_laravel_logs: number;
    limit_laravel_jobs: number;
    custom_css: string;
    show_badge_count: boolean;
    show_context: boolean;
    show_tips: boolean;
}
