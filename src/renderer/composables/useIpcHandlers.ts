import { computed } from 'vue';
import type { IpcRendererEvent } from 'electron';
import { useScreenStore } from '@/store/screen';
import { useSettingsStore } from '@/store/settings';
import { useSplitPanesStore } from '@/store/split-panes';
import { useCurrentProject } from '@/store/current-project';
import { useXDebug } from '@/store/xdebug';
import { usePayloadStore } from '@/store/payload';
import { ipc } from '@/ipc/client';
import type { IpcReceiveChannel } from '@/types/ipc';
import { useScreenNavigation } from '@/composables/useScreenNavigation';
import { useDumpDispatch } from '@/composables/useDumpDispatch';

type IpcHandler = (event: IpcRendererEvent, ...args: any[]) => void;

const HOME_SCREEN = { screen_name: 'home', raise_in: 0, visible: true, pinned: false, new_window: false };

export function useIpcHandlers() {
    const nav = useScreenNavigation();
    const dumps = useDumpDispatch(nav);

    const screenStore = useScreenStore();
    const settingsStore = useSettingsStore();
    const splitPanesStore = useSplitPanesStore();
    const currentProjectStore = useCurrentProject();
    const xDebugStore = useXDebug();
    const payloadStore = usePayloadStore();

    const handleAppVersionReply = (_: IpcRendererEvent, arg: { version: string }) => {
        document.title = 'LaraDumps - ' + `v${arg.version}`;
    };

    const dumpsBagFiltered = computed(() => payloadStore.dumpsBagFiltered);

    const APP_HANDLERS: Record<string, IpcHandler> = {
        dump: dumps.handleDump,
        'main:app-version.reply': handleAppVersionReply,
        'app:screen-window-enable': nav.handleAppScreenWindowEnable,
        'app:screen-window-update': nav.handleAppScreenWindowUpdate,
        'xdebug-connected': nav.handleXdebugConnected,
        'xdebug-disconnected': nav.handleXdebugDisconnected,
        xdebug: dumps.handleXdebug,
        'saved-dumps:remove': nav.handleSavedDumpsRemove,
        'storage.get-environments.reply': nav.handleEnvironmentsRetrieved,
        'storage.get-yaml.reply': nav.handleYamlRetrieved,
        'storage.update-section.reply': nav.handleYamlSectionUpdated
    };

    const bind = (map: Record<string, IpcHandler>, on: boolean) =>
        Object.entries(map).forEach(([channel, handler]) =>
            (on ? ipc.on : ipc.off)(channel as IpcReceiveChannel, handler)
        );

    const registerListeners = () => {
        if (xDebugStore.current) {
            nav.xdebugMode.value = typeof xDebugStore.current.project_path !== 'undefined';
        }

        nav.addScreen({ ...HOME_SCREEN });

        bind(APP_HANDLERS, true);
        bind(dumps.DUMP_HANDLERS, true);

        ipc.send('main:app-version');
        ipc.send('local-shortcut:get');
        ipc.send('storage.get');

        nav.toggleScreen('home');

        if (settingsStore.settings.split_pane_screen) {
            splitPanesStore.setSplit(settingsStore.settings.split_pane_screen, 'vertical');
        }

        window.addEventListener('add-screen', nav.handleAddScreen);

        if (currentProjectStore.projectInfo) {
            ipc.send('storage.get-environments', currentProjectStore.projectInfo.path);
            ipc.send('storage.get-yaml', currentProjectStore.projectInfo.path);
        }

        if (settingsStore.settings.tail_log_enabled) {
            nav.enableTailLog();
        }
    };

    const clearListeners = () => {
        bind(APP_HANDLERS, false);
        bind(dumps.DUMP_HANDLERS, false);
        window.removeEventListener('add-screen', nav.handleAddScreen);
    };

    return {
        environments: nav.environments,
        yamlConfig: nav.yamlConfig,
        xdebugMode: nav.xdebugMode,
        inScreenWindow: nav.inScreenWindow,
        payloadScreen: nav.payloadScreen,
        jobScreen: nav.jobScreen,
        mailScreen: nav.mailScreen,
        logScreen: nav.logScreen,
        queriesScreen: nav.queriesScreen,
        brainScreen: nav.brainScreen,
        dumpsBagFiltered,
        // navigation actions
        toggleScreen: nav.toggleScreen,
        openScreenWindow: nav.openScreenWindow,
        handleEnvironmentSelected: nav.handleEnvironmentSelected,
        handleRemoveEnvironmentScreen: nav.handleRemoveEnvironmentScreen,
        enableTailLog: nav.enableTailLog,
        disableTailLog: nav.disableTailLog,
        // lifecycle
        registerListeners,
        clearListeners
    };
}
