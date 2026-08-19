import { nextTick, ref } from 'vue';
import { useScreenStore } from '@/store/screen';
import { useTimeStore } from '@/store/time';
import { useGlobalSearchStore } from '@/store/global-search';
import { useColorStore } from '@/store/colors';
import { Payload, ScreenPayload } from '@/types/Payload';
import { usePayloadStore } from '@/store/payload';
import { useSettingsStore } from '@/store/settings';
import { useXDebug } from '@/store/xdebug';
import { useJobStore } from '@/store/jobs';
import { useMailStore } from '@/store/mail';
import { useLogStore } from '@/store/logs';
import { useTailLogStore } from '@/store/tail-log';
import { useQueriesPayloadStore } from '@/store/queries';
import { useBrainStore } from '@/store/brains';
import { useLivewireStore } from '@/store/livewire';
import { useQueriesBlockedStore } from '@/store/queries-blocked';
import {
    usePauseQueriesStore,
    usePauseProfileStore,
    usePausePayloadStore,
    usePauseJobsStore,
    usePauseLogsStore
} from '@/store/pauses';
import { deepClone } from '@/lib/deep_clone';
import { checkApplicationPath, sendToScreenWindow, openNewScreenWindow } from '@/utils/ipc';
import { useSavedDumpsStore } from '@/store/saved-dumps';
import { usePendingRequestsStore } from '@/store/pending-requests';
import { useCurrentProject } from '@/store/current-project';
import { Environment } from '../../main/storage';
import { useSplitPanesStore } from '@/store/split-panes';
import { useProfileStore } from '@/store/profile';

export function useIpcHandlers() {
    const xDebugStore = useXDebug();
    const screenStore = useScreenStore();
    const timeStore = useTimeStore();
    const colorStore = useColorStore();
    const globalSearchStore = useGlobalSearchStore();
    const payloadStore = usePayloadStore();
    const settingsStore = useSettingsStore();
    const logStore = useLogStore();
    const tailLogStore = useTailLogStore();
    const queriesStore = useQueriesPayloadStore();
    const pausePayloadStore = usePausePayloadStore();
    const pauseLogsStore = usePauseLogsStore();
    const livewireStore = useLivewireStore();
    const splitPanesStore = useSplitPanesStore();
    const brainStore = useBrainStore();
    const profileStore = useProfileStore();
    const jobStore = useJobStore();
    const mailStore = useMailStore();
    const pendingRequestsStore = usePendingRequestsStore();
    const blockedStore = useQueriesBlockedStore();
    const pauseQueries = usePauseQueriesStore();
    const pauseProfileStore = usePauseProfileStore();
    const currentProjectStore = useCurrentProject();
    const pauseJobsStore = usePauseJobsStore();
    const savedStore = useSavedDumpsStore();

    const inScreenWindow = ref('');
    const payloadScreen = ref([]);
    const jobScreen = ref({});
    const mailScreen = ref([]);
    const logScreen = ref({});
    const queriesScreen = ref([]);
    const brainScreen = ref({});
    const applicationPath = ref('');
    const xdebugMode = ref(false);
    const environments = ref<Environment[]>([]);
    const yamlConfig = ref<Record<string, any>>({});

    const addScreen = (param: ScreenPayload) => {
        param.visible = true;
        param.pinned = false;
        screenStore.add(param);
    };

    const maximizeApp = (autoInvokeApp: string | boolean): void => {
        autoInvokeApp && window.ipcRenderer.send('main:show');
    };

    const toggleScreen = async (value: string, shouldActivate = false): Promise<void> => {
        if (screenStore.get(value) && !screenStore.get(value).visible) {
            return;
        }

        if (shouldActivate) {
            screenStore.activeScreen(value);
            await nextTick();
        }

        if (screenStore.screen === value) {
            payloadStore.filteredPayload = payloadStore.payload.filter(
                (payload) => payload.type !== 'screen' && payload.to_screen.screen_name === value
            );
        }

        await nextTick(() => {
            if (!['jobs', 'mail', 'logs', 'queries', 'tail_logs'].includes(screenStore.screen)) {
                document.getElementById(settingsStore.settings.scroll_direction)?.scrollIntoView({ behavior: 'smooth' });
            }
        });
    };

    const dispatch = (content: any): void => {
        if (pausePayloadStore.is_paused) {
            return;
        }

        content.rendered = false;

        checkApplicationPath(content, applicationPath);

        if (!content.hasOwnProperty('to_screen')) {
            alert('An error occurred, please update the app and laradumps-core and try again.');
            window.location.reload();
        }

        if (content.to_screen && typeof content.to_screen.screen_name == 'string') {
            addScreen(content.to_screen);
        }

        if (payloadStore.payload.length >= settingsStore.settings.limit_dumps) {
            payloadStore.payload.shift();
        }

        if (settingsStore.settings.show_badge_count) {
            content.show_badge_count = true;
        }

        content.color = content.color || 'gray';
        content.projectInfo = currentProjectStore.projectInfo;

        payloadStore.add(content);

        maximizeApp(content.auto_invoke_app);

        const serializablePayload = deepClone(
            payloadStore.payload.filter(
                (payload: Payload) => payload.to_screen?.screen_name === content.to_screen.screen_name
            )
        );

        if (content.to_screen.new_window) {
            openNewScreenWindow(screenStore, content.to_screen.screen_name, {
                payload: serializablePayload
            });
        } else {
            sendToScreenWindow(content.to_screen.screen_name, {
                payload: serializablePayload
            });
        }

        if (splitPanesStore.splitConfig?.active) {
            const paneAScreen = screenStore.screen;
            const targetScreen = content.to_screen.screen_name;

            nextTick(() => {
                toggleScreen(targetScreen, false);
                setTimeout(() => toggleScreen(paneAScreen, true), 100);
            });

            return;
        }

        setTimeout(() => toggleScreen(content.to_screen.screen_name, false), 10);
    };

    const passthroughHandler = (_: any, { content }: any) => {
        if (pausePayloadStore.is_paused) return;
        dispatch(content);
    };

    const handleDump = (_: any, { content }: any) => {
        dispatch(content);
    };

    const handleAppVersionReply = (_: any, arg: any) => {
        document.title = 'LaraDumps - ' + `v${arg.version}`;
    };

    const handleAppScreenWindowEnable = async (_: any, args: any) => {
        inScreenWindow.value = args.screen;
        payloadScreen.value = args.payload;
        jobScreen.value = args.jobs;
        mailScreen.value = args.mails;
        logScreen.value = args.logs;
        queriesScreen.value = args.queries;
        brainScreen.value = args.brains;

        setTimeout(() => (document.title = 'LaraDumps - ' + args.screen), 200);
    };

    const handleAppScreenWindowUpdate = async (_: any, args: any) => {
        payloadScreen.value = args.payload;
        jobScreen.value = args.jobs;
        mailScreen.value = args.mails;
        logScreen.value = args.logs;
        queriesScreen.value = args.queries;
        brainScreen.value = args.brains;
    };

    const handleXdebugConnected = (_: any, _arg: any) => {
        xdebugMode.value = true;
    };

    const handleXdebugDisconnected = (_: any, _arg: any) => {
        if (xDebugStore.current) {
            xDebugStore.current.project_path = '';
        }
        xdebugMode.value = false;
    };

    const handleXdebug = (_: any, { content }: any) => dispatch(content);

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

    const handleEnvironmentsRetrieved = (_: any, envs: Environment[]) => {
        if (!envs) return;
        environments.value = envs.map((env) => ({ ...env }));
    };

    const handleYamlRetrieved = (_: any, data: any) => {
        yamlConfig.value = data || {};
    };

    const handleYamlSectionUpdated = (_: any, { section, values, error }: any) => {
        if (error) {
            console.error('Error updating YAML section:', error);
            return;
        }
        if (section && values) {
            yamlConfig.value = { ...yamlConfig.value, [section]: values };
        }
    };

    const handleSavedDumpsRemove = (_: any, args: any) => {
        const { id } = args || {};
        if (!id) return;
        if (pausePayloadStore.is_paused) return;

        savedStore.remove(id);
        const updated = deepClone(savedStore.all);

        window.ipcRenderer.send('send-screen-window-update', {
            screen: 'saved',
            payload: updated
        });
    };

    const handleLivewire = (_: any, { content }: any) => {
        if (pausePayloadStore.is_paused) return;
        checkApplicationPath(content, applicationPath);
        livewireStore.add(content.livewire);
        dispatch(content);
    };

    const handleJobs = (_: any, { content }: any) => {
        if (pausePayloadStore.is_paused || pauseJobsStore.is_paused) return;
        checkApplicationPath(content, applicationPath);
        jobStore.addOrUpdateJob(content);

        const serializableJobs = deepClone(jobStore.jobs);

        if (content.to_screen.new_window) {
            openNewScreenWindow(screenStore, content.to_screen.screen_name, {
                payload: {},
                jobs: serializableJobs
            });
        }

        if (content.to_screen && !content.to_screen.new_window) {
            sendToScreenWindow(content.to_screen.screen_name, {
                payload: {},
                jobs: serializableJobs
            });
        }
    };

    const handleMail = (_: any, { content }: any) => {
        if (pausePayloadStore.is_paused) return;
        checkApplicationPath(content, applicationPath);
        mailStore.addOrUpdateMail(content.mail, content.ide_handle, content.context, content.related_job);
    };

    const handleLabel = (_: any, { content }: any) => {
        if (pausePayloadStore.is_paused) return;
        payloadStore.updateLabelPayload(content);
    };

    const handleContext = (_: any, { content }: any) => {
        if (pausePayloadStore.is_paused) return;
        payloadStore.updatePayload(content, 'context');
    };

    const handleLogApplication = (_: any, { content }: any) => {
        if (pausePayloadStore.is_paused || pauseLogsStore.is_paused) return;
        checkApplicationPath(content, applicationPath);
        logStore.add(content);

        const serializable = deepClone(logStore.logs);

        if (content.to_screen.new_window) {
            openNewScreenWindow(screenStore, content.to_screen.screen_name, {
                payload: {},
                logs: serializable
            });
        }

        if (content.to_screen && !content.to_screen.new_window) {
            sendToScreenWindow(content.to_screen.screen_name, {
                payload: {},
                logs: serializable
            });
        }
    };

    const handleColor = async (_: any, { content }: any) => {
        if (pausePayloadStore.is_paused) return;
        payloadStore.updateColorPayload(content);
    };

    const handleScreen = (_: any, { content }: any) => {
        if (pausePayloadStore.is_paused) return;
        payloadStore.updateScreenPayload(content);
        const screen: ScreenPayload = content.to_screen;
        addScreen(screen);

        if (screenStore.get(screen.screen_name)?.pinned) {
            toggleScreen(screen.screen_name, true);
        }

        if (screen.raise_in > 0) {
            setTimeout(() => {
                toggleScreen(screen.screen_name, true);
            }, screen.raise_in * 1000);
        }
    };

    const handleJsonValidate = (_: any, { content }: any) => {
        if (pausePayloadStore.is_paused) return;
        payloadStore.updateJSONValidatePayload(content);
    };

    const handleValidate = (_: any, { content }: any) => {
        if (pausePayloadStore.is_paused) return;
        payloadStore.updateValidatePayload(content);
    };

    let lastPayloadTimeout: NodeJS.Timeout | null = null;
    let lastPayloadReceivedTime = 0;

    const handleDumpBatches = (_: any, args: any) => {
        if (pausePayloadStore.is_paused || pauseQueries.is_paused) return;

        if (args.type === 'batch') {
            lastPayloadReceivedTime = Date.now();

            if (lastPayloadTimeout) {
                clearTimeout(lastPayloadTimeout);
                lastPayloadTimeout = null;
            }

            args.contents.forEach(({ content }) => {
                const requestId = content.request_id;
                const sqlQuery = content.queries.query?.sql;

                pendingRequestsStore.add(requestId, 'queries', sqlQuery);
                const storedQuery = pendingRequestsStore.get(requestId, 'queries');

                if (blockedStore.blocked.includes(storedQuery)) {
                    console.log(`all sql queries are blocked for request id ${requestId}`);
                    return;
                }

                content.queries && timeStore.increment(content.request_id, content.id, content.queries);
                checkApplicationPath(content, applicationPath);
                queriesStore.add(content);
                addScreen(content.to_screen);
            });

            lastPayloadTimeout = setTimeout(() => {
                if (Date.now() - lastPayloadReceivedTime >= 200) {
                    const lastPayload: Payload = queriesStore.payload[queriesStore.payload.length - 1];
                    if (lastPayload) {
                        timeStore.selected = lastPayload.request_id;
                    }
                }
            }, 200);
        }
    };

    const handleTimeTrack = (_: any, { content }: any) => {
        if (pausePayloadStore.is_paused) return;

        const exist = payloadStore.payload.filter(
            (globalPayload: Payload) => globalPayload.with_label.label === content.with_label.label
        );

        if (exist.length === 0) {
            dispatch(content);
            return;
        }

        payloadStore.updateTimeTrackPayload(content);
    };

    const handleBrain = (_: any, { content }: any) => {
        if (pausePayloadStore.is_paused) return;
        checkApplicationPath(content, applicationPath);
        brainStore.addOrUpdateBrain(content);

        const serializableBrains = deepClone(brainStore.brains);

        if (content.to_screen?.new_window) {
            openNewScreenWindow(screenStore, content.to_screen.screen_name, {
                payload: {},
                brains: serializableBrains
            });
        }

        if (content.to_screen && !content.to_screen.new_window) {
            sendToScreenWindow(content.to_screen.screen_name, {
                payload: {},
                brains: serializableBrains
            });
        }
    };

    const handleProfile = (_: any, { content }: any) => {
        if (pausePayloadStore.is_paused || pauseProfileStore.is_paused) return;
        checkApplicationPath(content, applicationPath);
        profileStore.addProfile(content);

        if (content.to_screen) {
            addScreen(content.to_screen);
        }

        if (content.to_screen?.new_window) {
            openNewScreenWindow(screenStore, content.to_screen.screen_name, {
                payload: {},
                profiles: deepClone(profileStore.profiles)
            });
        }

        if (content.to_screen && !content.to_screen.new_window) {
            sendToScreenWindow(content.to_screen.screen_name, {
                payload: {},
                profiles: deepClone(profileStore.profiles)
            });
        }
    };

    const handleTailEntries = (_: any, batch: any) => tailLogStore.addBatch(batch);
    const handleTailReset = () => tailLogStore.reset();
    const handleTailMeta = (_: any, meta: any) => tailLogStore.setMeta(meta);
    const handleTailError = (_: any, error: any) => tailLogStore.setError(error);
    const handleTailFilePicked = (_: any, { filePath }: any) => {
        tailLogStore.setMeta({ filePath });
        window.ipcRenderer.send('tail-log:start', {
            filePath,
            projectPath: currentProjectStore.projectInfo?.path
        });
    };

    const startTailLog = () => {
        window.ipcRenderer.send('tail-log:start', {
            projectPath: currentProjectStore.projectInfo?.path
        });
    };

    const enableTailLog = () => {
        addScreen({
            screen_name: 'tail_logs',
            raise_in: 0,
            visible: true,
            pinned: false,
            new_window: false
        });
        startTailLog();
    };

    const disableTailLog = () => {
        window.ipcRenderer.send('tail-log:stop');
        tailLogStore.reset();
        screenStore.remove('tail_logs');
        if (screenStore.screen === 'tail_logs') {
            toggleScreen('home', true);
        }
    };

    const dumpsBagFiltered = computed((): Payload[] => {
        const search = globalSearchStore.search.toLowerCase();

        return payloadStore.filteredPayload
            .filter((dump: Payload) => {
                if (!search) {
                    return true;
                }

                const content = dump[dump.type] ?? '';
                const contentMatch = JSON.stringify(content).toLowerCase().includes(search);
                const labelMatch = JSON.stringify(dump.with_label ?? '')
                    .toLowerCase()
                    .includes(search);

                return contentMatch || labelMatch;
            })
            .filter((dump: Payload) => {
                if (colorStore.colors.length > 0 && dump.color) {
                    return colorStore.colors.includes(dump.color);
                }
                return true;
            });
    });

    const dumpListeners = () => {
        window.ipcRenderer.on('livewire', handleLivewire);
        window.ipcRenderer.on('jobs', handleJobs);
        window.ipcRenderer.on('html', passthroughHandler);
        window.ipcRenderer.on('mailable', passthroughHandler);
        window.ipcRenderer.on('table_v2', passthroughHandler);
        window.ipcRenderer.on('table', passthroughHandler);
        window.ipcRenderer.on('http-client', passthroughHandler);
        window.ipcRenderer.on('model', passthroughHandler);
        window.ipcRenderer.on('json', passthroughHandler);
        window.ipcRenderer.on('query', passthroughHandler);
        window.ipcRenderer.on('mail', handleMail);
        window.ipcRenderer.on('label', handleLabel);
        window.ipcRenderer.on('context', handleContext);
        window.ipcRenderer.on('log_application', handleLogApplication);
        window.ipcRenderer.on('color', handleColor);
        window.ipcRenderer.on('screen', handleScreen);
        window.ipcRenderer.on('json_validate', handleJsonValidate);
        window.ipcRenderer.on('validate', handleValidate);
        window.ipcRenderer.on('dump.batches', handleDumpBatches);
        window.ipcRenderer.on('dump_group', handleDump);
        window.ipcRenderer.on('time_track', handleTimeTrack);
        window.ipcRenderer.on('brain', handleBrain);
        window.ipcRenderer.on('tail-log:entries', handleTailEntries);
        window.ipcRenderer.on('tail-log:reset', handleTailReset);
        window.ipcRenderer.on('tail-log:meta', handleTailMeta);
        window.ipcRenderer.on('tail-log:error', handleTailError);
        window.ipcRenderer.on('tail-log:file-picked', handleTailFilePicked);
        window.ipcRenderer.on('profiler', handleProfile);
    };

    const clearDumpListeners = () => {
        window.ipcRenderer.off('livewire', handleLivewire);
        window.ipcRenderer.off('jobs', handleJobs);
        window.ipcRenderer.off('html', passthroughHandler);
        window.ipcRenderer.off('mailable', passthroughHandler);
        window.ipcRenderer.off('table_v2', passthroughHandler);
        window.ipcRenderer.off('table', passthroughHandler);
        window.ipcRenderer.off('http-client', passthroughHandler);
        window.ipcRenderer.off('model', passthroughHandler);
        window.ipcRenderer.off('json', passthroughHandler);
        window.ipcRenderer.off('query', passthroughHandler);
        window.ipcRenderer.off('mail', handleMail);
        window.ipcRenderer.off('label', handleLabel);
        window.ipcRenderer.off('context', handleContext);
        window.ipcRenderer.off('log_application', handleLogApplication);
        window.ipcRenderer.off('color', handleColor);
        window.ipcRenderer.off('screen', handleScreen);
        window.ipcRenderer.off('json_validate', handleJsonValidate);
        window.ipcRenderer.off('validate', handleValidate);
        window.ipcRenderer.off('dump.batches', handleDumpBatches);
        window.ipcRenderer.off('dump_group', handleDump);
        window.ipcRenderer.off('time_track', handleTimeTrack);
        window.ipcRenderer.off('brain', handleBrain);
        window.ipcRenderer.off('tail-log:entries', handleTailEntries);
        window.ipcRenderer.off('tail-log:reset', handleTailReset);
        window.ipcRenderer.off('tail-log:meta', handleTailMeta);
        window.ipcRenderer.off('tail-log:error', handleTailError);
        window.ipcRenderer.off('tail-log:file-picked', handleTailFilePicked);
        window.ipcRenderer.off('profiler', handleProfile);
    };

    const clearListeners = () => {
        window.ipcRenderer.off('dump', handleDump);
        window.ipcRenderer.off('main:app-version.reply', handleAppVersionReply);
        window.ipcRenderer.off('app:screen-window-enable', handleAppScreenWindowEnable);
        window.ipcRenderer.off('app:screen-window-update', handleAppScreenWindowUpdate);
        window.ipcRenderer.off('xdebug-connected', handleXdebugConnected);
        window.ipcRenderer.off('xdebug-disconnected', handleXdebugDisconnected);
        window.ipcRenderer.off('xdebug', handleXdebug);
        window.ipcRenderer.off('saved-dumps:remove', handleSavedDumpsRemove);
        window.ipcRenderer.off('storage.get-environments.reply', handleEnvironmentsRetrieved);
        window.ipcRenderer.off('storage.get-yaml.reply', handleYamlRetrieved);
        window.ipcRenderer.off('storage.update-section.reply', handleYamlSectionUpdated);
        window.removeEventListener('add-screen', handleAddScreen);

        clearDumpListeners();
    };

    const registerListeners = () => {
        if (xDebugStore.current) {
            xdebugMode.value = typeof xDebugStore.current.project_path !== 'undefined';
        }

        addScreen({
            screen_name: 'home',
            raise_in: 0,
            visible: true,
            pinned: false,
            new_window: false
        });

        window.ipcRenderer.on('dump', handleDump);

        window.ipcRenderer.send('main:app-version');

        window.ipcRenderer.on('main:app-version.reply', handleAppVersionReply);
        window.ipcRenderer.on('app:screen-window-enable', handleAppScreenWindowEnable);
        window.ipcRenderer.on('app:screen-window-update', handleAppScreenWindowUpdate);

        window.ipcRenderer.send('local-shortcut:get');

        window.ipcRenderer.on('xdebug-connected', handleXdebugConnected);
        window.ipcRenderer.on('xdebug-disconnected', handleXdebugDisconnected);
        window.ipcRenderer.on('xdebug', handleXdebug);

        dumpListeners();

        window.ipcRenderer.send('storage.get');

        toggleScreen('home');

        if (settingsStore.settings.split_pane_screen) {
            splitPanesStore.setSplit(settingsStore.settings.split_pane_screen, 'vertical');
        }

        window.addEventListener('add-screen', handleAddScreen);
        window.ipcRenderer.on('saved-dumps:remove', handleSavedDumpsRemove);

        window.ipcRenderer.on('storage.get-environments.reply', handleEnvironmentsRetrieved);
        window.ipcRenderer.on('storage.get-yaml.reply', handleYamlRetrieved);
        window.ipcRenderer.on('storage.update-section.reply', handleYamlSectionUpdated);

        if (currentProjectStore.projectInfo) {
            window.ipcRenderer.send('storage.get-environments', currentProjectStore.projectInfo.path);
            window.ipcRenderer.send('storage.get-yaml', currentProjectStore.projectInfo.path);
        }

        if (settingsStore.settings.tail_log_enabled) {
            enableTailLog();
        }
    };

    return {
        inScreenWindow,
        payloadScreen,
        jobScreen,
        mailScreen,
        logScreen,
        queriesScreen,
        brainScreen,
        applicationPath,
        xdebugMode,
        environments,
        yamlConfig,
        dumpsBagFiltered,
        addScreen,
        toggleScreen,
        openScreenWindow: (targetScreen?: string) => {
            const screen = targetScreen ?? screenStore.screen;

            screenStore.toggleVisible(screen);

            const serializablePayload = deepClone(payloadStore.get(screen));
            const serializableJobPayload = deepClone(jobStore.jobs);
            const serializableMailPayload = deepClone(mailStore.mails);
            const serializableLogPayload = deepClone(logStore.logs);
            const serializableQueriesPayload = deepClone(queriesStore.payload);
            const serializableBrainsPayload = deepClone(brainStore.brains);
            const serializableProfilesPayload = deepClone(profileStore.profiles);

            window.ipcRenderer.send('screen-window:show', {
                screen,
                payload: serializablePayload,
                jobs: serializableJobPayload,
                mails: serializableMailPayload,
                logs: serializableLogPayload,
                queries: serializableQueriesPayload,
                brains: serializableBrainsPayload,
                profiles: serializableProfilesPayload,
                position: {}
            });

            setTimeout(() => {
                const next = screen === 'home' ? screenStore.getNext('home').screen_name : 'home';
                toggleScreen(next);
            }, 200);
        },
        handleEnvironmentSelected: async (environment: Environment) => {
            environment.selected = true;

            if (currentProjectStore.projectInfo) {
                window.ipcRenderer.once('storage.update.reply', () => {
                    window.ipcRenderer.send('storage.get-yaml', currentProjectStore.projectInfo.path);
                });

                window.ipcRenderer.send('storage.update', {
                    selected: environments.value.map(({ value, selected }) => ({ value, selected })),
                    path: currentProjectStore.projectInfo.path
                });
            }

            const screenName = environment.value;
            addScreen({
                screen_name: screenName,
                raise_in: 0,
                visible: true,
                pinned: false,
                new_window: false
            });

            await toggleScreen(screenName, true);
        },
        handleRemoveEnvironmentScreen: async (screenName: string) => {
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

                if (currentProjectStore.projectInfo) {
                    window.ipcRenderer.send('storage.update', {
                        selected: environments.value.map(({ value, selected }) => ({ value, selected })),
                        path: currentProjectStore.projectInfo.path
                    });
                }
            }

            if (screenStore.screen === screenName) {
                const nextScreens = screenStore.allVisible();
                const nextScreen = nextScreens.length > 0 ? nextScreens[0] : { screen_name: 'home' };
                await toggleScreen(nextScreen.screen_name, true);
            }
        },
        enableTailLog,
        disableTailLog,
        registerListeners,
        clearListeners
    };
}
