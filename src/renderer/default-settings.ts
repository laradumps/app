import { Settings } from '@/types/settings.type';

export const DEFAULT_SETTINGS: Settings = {
    version: '',
    theme: 'dark',
    language: 'en',
    check_for_updates: 'auto_download',
    ide_handler: 'phpstorm://open?file={filepath}&line={line}',
    auto_launch: 'disabled',
    scroll_direction: 'top',
    dump_order: 'normal',
    shortcuts: {
        always_on_top: {
            originalValue: process.platform === 'darwin' ? '⌥+⇧+T' : 'Ctrl+Shift+T',
            keys: process.platform === 'darwin' ? 'Alt+Shift+T' : 'Ctrl+Shift+T',
            label: 'settings.shortcut.alwaysOnTop'
        },
        clear_all: {
            originalValue: process.platform === 'darwin' ? '⌥+⇧+K' : 'Ctrl+Shift+K',
            keys: process.platform === 'darwin' ? 'Alt+Shift+K' : 'Ctrl+Shift+K',
            label: 'settings.shortcut.clear'
        },
        global_search: {
            originalValue: process.platform === 'darwin' ? '⌘+K' : 'Ctrl+K',
            keys: 'CommandOrControl+K',
            label: 'settings.shortcut.globalSearch'
        }
    },
    window_width: 760,
    window_height: 620,
    show_pause_button: true,
    show_ssh_button: true,
    show_variable_type: true,
    limit_dumps: 300,
    limit_laravel_queries: 100,
    mcp_enabled: false,
    mcp_port: 3002,
    limit_laravel_logs: 100,
    limit_laravel_jobs: 100,
    custom_css: '/* // Example: \n [data-theme="custom"] .header { \n    background-color: red; \n } \n */',
    show_badge_count: true,
    show_context: true,
    show_tips: true,
    split_pane_screen: null,
    grouped_by_time: true,
    display_last_log: false,
    mcp_limit_payload_objects: 10,
    window_blur: false,
    window_blur_mode: 'fullscreen-ui',
    window_blur_opacity: 50,
    window_blur_shadow: false
};
