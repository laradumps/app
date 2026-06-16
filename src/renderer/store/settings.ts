import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { Settings } from '@/types/settings.type';
import { DEFAULT_SETTINGS } from '@/default-settings';
import { deepClone } from '@/lib/deep_clone';

const themeColors = {
    system: 'System',
    light: 'Light',
    dark: 'Dark',
    dracula: 'Dracula',
    dim: 'Dim',
    retro: 'Retro',
    halloween: 'Halloween',
    cyberpunk: 'Cyberpunk',
    lemonade: 'Lemonade',
    winter: 'Winter',
    forest: 'Forest',
    valentine: 'Valentine',
    aqua: 'Aqua',
    emerald: 'Emerald',
    midnight: 'Midnight',
    nord: 'Nord',
    silk: 'Silk',
    luxury: 'Luxury',
    cupcake: 'Cupcake',
    caramellatte: 'Caramel Latte',
    custom: 'Custom',
    laravel12: 'Laravel 12 Dark',
    tokyonight: 'Tokyo Night'
};

const languageOptions = {
    en: 'English',
    pt_BR: 'Português (BR)',
    es_ES: 'Español (ES)',
    fa_IR: 'فارسی (IR)',
    ar_AR: 'عربي (AR)',
    it_IT: 'Italiano (IT)',
    zh_CN: 'Chinese (CN)',
    id_ID: 'Indonesian (ID)',
    al_AL: 'Shqip (AL)',
    tr_TR: 'Türkçe (TR)',
    ko_KR: '한국어 (KR)'
};

const ideHandlerOptions = {
    'phpstorm://open?file={filepath}&line={line}': 'PHPStorm',
    'phpstorm://open?file={wsl_config}{filepath}&line={line}': 'PHPStorm WSL',
    'vscode://file/{filepath}:{line}': 'VS Code',
    'vscode://vscode-remote/{wsl_config}{filepath}:{line}': 'VS Code Remote',
    'vscode-insiders://file/{filepath}:{line}': 'VS Code Insiders',
    'cursor://file/{filepath}:{line}': 'Cursor',
    'subl://open?url=file://{filepath}&line={line}': 'Sublime',
    'atom://core/open/file?filename={filepath}&line={line}': 'Atom',
    'windsurf://file/{filepath}:{line}': 'WindSurf'
};

const checkForUpdateOptions = {
    auto_download: 'Automatic',
    manual_download: 'Manual Download',
    auto_install: 'Download and Install'
};

const autoLaunchOptions = {
    disabled: 'Disabled',
    enabled: 'Enabled'
};

const scrollDirection = {
    top: 'Top',
    bottom: 'Bottom'
};

const dumpOrder = {
    normal: 'Normal',
    reversed: 'Reversed'
};

export const useSettingsStore = defineStore('settings', () => {
    const themes = ref(themeColors);

    const savedSettings = localStorage.getItem('user-settings');
    const initial = savedSettings ? JSON.parse(savedSettings) : {};
    const settings = ref<Settings>({ ...DEFAULT_SETTINGS, ...initial });

    const updateAvailable = ref<boolean>(false);
    const updateDownloaded = ref<boolean>(false);
    const updateDownloading = ref<boolean>(false);
    const updateProgress = ref<number>(0);
    const latestVersion = ref<string>('');

    const setUpdateAvailable = (version) => {
        latestVersion.value = String(version || '');
        updateAvailable.value = true;
        updateDownloading.value = false;
        updateProgress.value = 0;
    };

    const setUpdateDownloaded = (downloaded: boolean) => {
        updateDownloaded.value = downloaded;
        updateDownloading.value = false;
        updateProgress.value = 100;
        if (downloaded) {
            updateAvailable.value = true;
        }
    };

    const setUpdateDownloading = (downloading: boolean) => {
        updateDownloading.value = downloading;
    };

    const setUpdateProgress = (progress: number) => {
        updateProgress.value = progress;
    };

    const markUpdated = () => {
        updateAvailable.value = false;
        updateDownloaded.value = false;
        updateDownloading.value = false;
        updateProgress.value = 0;
    };

    const update = () => {
        const serializablePayload = deepClone(settings.value);

        localStorage.setItem('user-settings', JSON.stringify(serializablePayload));

        window.ipcRenderer.send('settings.store', serializablePayload);
    };

    const setSettings = (newSettings: any) => {
        settings.value = newSettings;
        localStorage.setItem('user-settings', JSON.stringify(newSettings));
    };

    const setSplitPaneScreen = (screenName: string | null) => {
        settings.value.split_pane_screen = screenName;
        update();
    };

    // `blurActive` reflects whether the window was actually CREATED with native vibrancy/acrylic
    // this session (sent by the main process on init). The glass CSS is gated on it because the
    // effect can only be turned on/off by recreating the window — runtime setVibrancy is a no-op
    // on macOS. Opacity/shadow are pure CSS and apply live while the effect is active.
    const blurActive = ref(false);
    let glassObserver: MutationObserver | null = null;

    // Injects (or updates) a <style> tag appended to the END of <head>.
    // Cascade rule: the last stylesheet wins when specificity/importance is equal.
    // Injecting via JS after DaisyUI's CSS guarantees we always come last,
    // bypassing any @layer ordering issues from the Tailwind/DaisyUI compilation.
    const GLASS_STYLE_ID = 'ld-glass-override';
    const injectGlassStyle = () => {
        const s = settings.value;
        const pct = `${s.window_blur_opacity ?? 65}%`;
        const shadows = blurActive.value && !!s.window_blur_shadow;

        let tag = document.getElementById(GLASS_STYLE_ID) as HTMLStyleElement | null;
        if (!tag) {
            tag = document.createElement('style');
            tag.id = GLASS_STYLE_ID;
            document.head.appendChild(tag);
        } else {
            // Re-append to ensure it stays LAST in <head> after any HMR CSS injection
            document.head.appendChild(tag);
        }

        tag.textContent = `
            /* LaraDumps glass/vibrancy override — injected last to win all cascade battles */
            :root, html, body { background: transparent !important; background-color: transparent !important; background-image: none !important; transition: none !important; animation: none !important; }
            [data-theme] { background: transparent !important; background-color: transparent !important; background-image: none !important; --root-bg: transparent !important; --page-scroll-bg: transparent !important; --page-scroll-bg-on: transparent !important; }
            .bg-base-100 { background-color: color-mix(in oklab, var(--color-base-100) ${pct}, transparent) !important; }
            .bg-base-200 { background-color: color-mix(in oklab, var(--color-base-200) ${pct}, transparent) !important; }
            .bg-base-300 { background-color: color-mix(in oklab, var(--color-base-300) ${pct}, transparent) !important; }
            :is(.modal-box, .dropdown-content, .table, .card, .alert, .collapse, .tabs-box) { background-color: color-mix(in oklab, var(--color-base-100) ${pct}, transparent) !important; }
            ${shadows ? ':is(.bg-base-200, .navbar, .menu, .modal-box, .dropdown-content, .card) { box-shadow: 0 2px 14px color-mix(in oklab, black 28%, transparent); }' : ''}
        `;
    };

    const removeGlassStyle = () => {
        document.getElementById(GLASS_STYLE_ID)?.remove();
    };

    const applyWindowBlur = (active?: boolean) => {
        if (typeof active === 'boolean') {
            blurActive.value = active;
        }

        const html = document.documentElement;

        if (blurActive.value) {
            html.classList.add('glass-enabled');
            html.classList.toggle('glass-shadows', !!settings.value.window_blur_shadow);
            html.style.setProperty('--glass-pct', `${settings.value.window_blur_opacity ?? 65}%`);
            injectGlassStyle();

            // Guard: re-assert if anything removes the class (HMR, theme switches, etc.)
            if (!glassObserver) {
                glassObserver = new MutationObserver(() => {
                    if (!html.classList.contains('glass-enabled')) {
                        glassObserver!.disconnect();
                        html.classList.add('glass-enabled');
                        html.classList.toggle('glass-shadows', !!settings.value.window_blur_shadow);
                        injectGlassStyle();
                        glassObserver!.observe(html, { attributes: true, attributeFilter: ['class'] });
                    }
                });
                glassObserver.observe(html, { attributes: true, attributeFilter: ['class'] });
            }
        } else {
            if (glassObserver) {
                glassObserver.disconnect();
                glassObserver = null;
            }
            html.classList.remove('glass-enabled');
            html.classList.remove('glass-shadows');
            removeGlassStyle();
        }
    };

    watch(
        () => settings.value.theme,
        (newTheme) => {
            localStorage.setItem('user-settings', JSON.stringify(settings.value));
            document.documentElement.setAttribute('data-theme', newTheme);
        }
    );

    watch(
        () => [settings.value.window_blur_opacity, settings.value.window_blur_shadow],
        () => applyWindowBlur()
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
        setSettings,
        updateAvailable,
        updateDownloaded,
        updateDownloading,
        updateProgress,
        latestVersion,
        setUpdateAvailable,
        setUpdateDownloaded,
        setUpdateDownloading,
        setUpdateProgress,
        markUpdated,
        setSplitPaneScreen,
        applyWindowBlur
    };
});
