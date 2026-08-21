import { nextTick, ref } from 'vue';
import type { IpcRendererEvent } from 'electron';
import { useScreenStore } from '@/store/screen';
import { useTimeStore } from '@/store/time';
import { useSettingsStore } from '@/store/settings';
import { usePayloadStore } from '@/store/payload';
import { useJobStore } from '@/store/jobs';
import { useMailStore } from '@/store/mail';
import { useLogStore } from '@/store/logs';
import { useTailLogStore } from '@/store/tail-log';
import { useQueriesPayloadStore } from '@/store/queries';
import { useBrainStore } from '@/store/brains';
import { useLivewireStore } from '@/store/livewire';
import { useQueriesBlockedStore } from '@/store/queries-blocked';
import { useProfileStore } from '@/store/profile';
import { useSavedDumpsStore } from '@/store/saved-dumps';
import { useCurrentProject } from '@/store/current-project';
import { useXDebug } from '@/store/xdebug';
import { usePausePayloadStore } from '@/store/pauses';
import { Payload, ScreenPayload } from '@/types/Payload';
import { Environment } from '../../main/storage';
import { deepClone } from '@/utils/deep_clone';
import { ipc } from '@/ipc/client';

const NON_SCROLLING_SCREENS = ['jobs', 'mail', 'logs', 'queries', 'tail_logs'];

export function useScreenNavigation() {
    const screenStore = useScreenStore();
    const timeStore = useTimeStore();
    const settingsStore = useSettingsStore();
    const payloadStore = usePayloadStore();
    const jobStore = useJobStore();
    const mailStore = useMailStore();
    const logStore = useLogStore();
    const tailLogStore = useTailLogStore();
    const queriesStore = useQueriesPayloadStore();
    const brainStore = useBrainStore();
    const livewireStore = useLivewireStore();
    const blockedStore = useQueriesBlockedStore();
    const profileStore = useProfileStore();
    const savedStore = useSavedDumpsStore();
    const currentProjectStore = useCurrentProject();
    const xDebugStore = useXDebug();
    const pausePayloadStore = usePausePayloadStore();

    const environments = ref<Environment[]>([]);
    const yamlConfig = ref<Record<string, any>>({});
    const xdebugMode = ref(false);

    const inScreenWindow = ref('');
    const payloadScreen = ref<Payload[]>([]);
    const jobScreen = ref<any>({});
    const mailScreen = ref<any[]>([]);
    const logScreen = ref<any>({});
    const queriesScreen = ref<any[]>([]);
    const brainScreen = ref<any>({});

    const addScreen = (param: ScreenPayload) => {
        param.visible = true;
        param.pinned = false;
        screenStore.add(param);
    };

    const toggleScreen = (value: string, shouldActivate = false): void => {
        if (screenStore.get(value) && !screenStore.get(value).visible) {
            return;
        }

        if (value) {
            payloadStore.filteredPayload = payloadStore.payload.filter(
                (payload) => payload.type !== 'screen' && payload.to_screen?.screen_name === value
            );
        }

        if (shouldActivate) {
            screenStore.activeScreen(value);
        }

        nextTick(() => {
            if (!NON_SCROLLING_SCREENS.includes(screenStore.screen)) {
                document.getElementById(settingsStore.settings.scroll_direction)?.scrollIntoView({ behavior: 'auto' });
            }
        });
    };

    const openScreenWindow = (targetScreen?: string) => {
        const screen = targetScreen ?? screenStore.screen;

        screenStore.toggleVisible(screen);

        ipc.send('screen-window:show', {
            screen,
            payload: deepClone(payloadStore.get(screen)),
            jobs: deepClone(jobStore.jobs),
            mails: deepClone(mailStore.mails),
            logs: deepClone(logStore.logs),
            queries: deepClone(queriesStore.payload),
            brains: deepClone(brainStore.brains),
            profiles: deepClone(profileStore.profiles),
            position: {}
        });

        setTimeout(() => {
            const next = screen === 'home' ? screenStore.getNext('home').screen_name : 'home';
            toggleScreen(next);
        }, 200);
    };

    const startTailLog = () => {
        ipc.send('tail-log:start', { projectPath: currentProjectStore.projectInfo?.path });
    };

    const enableTailLog = () => {
        addScreen({ screen_name: 'tail_logs', raise_in: 0, visible: true, pinned: false, new_window: false });
        startTailLog();
    };

    const disableTailLog = () => {
        ipc.send('tail-log:stop');
        tailLogStore.reset();
        screenStore.remove('tail_logs');
        if (screenStore.screen === 'tail_logs') {
            toggleScreen('home', true);
        }
    };

    const persistEnvironments = () => {
        if (!currentProjectStore.projectInfo) return;
        ipc.send('storage.update', {
            selected: environments.value.map(({ value, selected }) => ({ value, selected })),
            path: currentProjectStore.projectInfo.path
        });
    };

    const handleEnvironmentSelected = async (environment: Environment) => {
        environment.selected = true;

        if (currentProjectStore.projectInfo) {
            ipc.once('storage.update.reply', () => {
                ipc.send('storage.get-yaml', currentProjectStore.projectInfo.path);
            });
            persistEnvironments();
        }

        addScreen({
            screen_name: environment.value,
            raise_in: 0,
            visible: true,
            pinned: false,
            new_window: false
        });

        await toggleScreen(environment.value, true);
    };

    const handleRemoveEnvironmentScreen = async (screenName: string) => {
        screenStore.remove(screenName);
        payloadStore.clear(screenName);

        switch (screenName) {
            case 'queries':
                queriesStore.clear();
                timeStore.clear();
                blockedStore.clear();
                break;
            case 'jobs':
                jobStore.clear();
                break;
            case 'log':
                logStore.clear();
                break;
            case 'mail':
                mailStore.clear();
                break;
            case 'livewire':
                livewireStore.clear();
                break;
            case 'brain':
                brainStore.clear();
                break;
            case 'profiler':
                profileStore.clear();
                break;
        }

        const environment = environments.value.find((env) => env.value === screenName);
        if (environment) {
            environment.selected = false;
            persistEnvironments();
        }

        if (screenStore.screen === screenName) {
            const nextScreens = screenStore.allVisible();
            const nextScreen = nextScreens.length > 0 ? nextScreens[0] : { screen_name: 'home' };
            await toggleScreen(nextScreen.screen_name, true);
        }
    };

    const handleAddScreen = (event: Event) => {
        const detail: Environment = (event as CustomEvent).detail;
        const screenName = detail.value;

        if (detail.selected) {
            addScreen({
                screen_name: screenName,
                raise_in: 0,
                visible: true,
                pinned: false,
                new_window: false
            });
        } else {
            screenStore.remove(screenName);
        }
    };

    const handleAppScreenWindowEnable = (_: IpcRendererEvent, args: any) => {
        inScreenWindow.value = args.screen;
        payloadScreen.value = args.payload;
        jobScreen.value = args.jobs;
        mailScreen.value = args.mails;
        logScreen.value = args.logs;
        queriesScreen.value = args.queries;
        brainScreen.value = args.brains;

        setTimeout(() => (document.title = 'LaraDumps - ' + args.screen), 200);
    };

    const handleAppScreenWindowUpdate = (_: IpcRendererEvent, args: any) => {
        payloadScreen.value = args.payload;
        jobScreen.value = args.jobs;
        mailScreen.value = args.mails;
        logScreen.value = args.logs;
        queriesScreen.value = args.queries;
        brainScreen.value = args.brains;
    };

    const handleEnvironmentsRetrieved = (_: IpcRendererEvent, envs: Environment[]) => {
        if (!envs) return;
        environments.value = envs.map((env) => ({ ...env }));
    };

    const handleYamlRetrieved = (_: IpcRendererEvent, data: Record<string, any>) => {
        yamlConfig.value = data || {};
    };

    const handleYamlSectionUpdated = (
        _: IpcRendererEvent,
        { section, values, error }: { section: string; values: any; error?: string }
    ) => {
        if (error) {
            console.error('Error updating YAML section:', error);
            return;
        }
        if (section && values) {
            yamlConfig.value = { ...yamlConfig.value, [section]: values };
        }
    };

    const handleXdebugConnected = () => {
        xdebugMode.value = true;
    };

    const handleXdebugDisconnected = () => {
        if (xDebugStore.current) {
            xDebugStore.current.project_path = '';
        }
        xdebugMode.value = false;
    };

    const handleSavedDumpsRemove = (_: IpcRendererEvent, args: { id: string }) => {
        const { id } = args || {};
        if (!id || pausePayloadStore.is_paused) return;

        savedStore.remove(id);
        ipc.send('send-screen-window-update', { screen: 'saved', payload: deepClone(savedStore.all) });
    };

    const handleTailEntries = (_: IpcRendererEvent, batch: any[]) => tailLogStore.addBatch(batch);
    const handleTailReset = () => tailLogStore.reset();
    const handleTailMeta = (_: IpcRendererEvent, meta: { filePath?: string }) => tailLogStore.setMeta(meta);
    const handleTailError = (_: IpcRendererEvent, error: string) => tailLogStore.setError(error);
    const handleTailFilePicked = (_: IpcRendererEvent, { filePath }: { filePath: string }) => {
        tailLogStore.setMeta({ filePath });
        ipc.send('tail-log:start', { filePath, projectPath: currentProjectStore.projectInfo?.path });
    };

    return {
        // view state
        environments,
        yamlConfig,
        xdebugMode,
        inScreenWindow,
        payloadScreen,
        jobScreen,
        mailScreen,
        logScreen,
        queriesScreen,
        brainScreen,
        // navigation
        addScreen,
        toggleScreen,
        openScreenWindow,
        // environments
        handleEnvironmentSelected,
        handleRemoveEnvironmentScreen,
        handleAddScreen,
        // tail log
        startTailLog,
        enableTailLog,
        disableTailLog,
        // ipc receive handlers
        handleAppScreenWindowEnable,
        handleAppScreenWindowUpdate,
        handleEnvironmentsRetrieved,
        handleYamlRetrieved,
        handleYamlSectionUpdated,
        handleXdebugConnected,
        handleXdebugDisconnected,
        handleSavedDumpsRemove,
        handleTailEntries,
        handleTailReset,
        handleTailMeta,
        handleTailError,
        handleTailFilePicked
    };
}

export type ScreenNavigation = ReturnType<typeof useScreenNavigation>;
