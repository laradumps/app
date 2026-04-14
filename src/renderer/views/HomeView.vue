<script lang="ts" setup>
import { computed, nextTick, onBeforeMount, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useScreenStore } from '@/store/screen';
import { useI18nStore } from '@/store/i18n';
import { useTimeStore } from '@/store/time';
import { useGlobalSearchStore } from '@/store/global-search';
import { useI18n } from 'vue-i18n';
import { useColorStore } from '@/store/colors';
import { Payload, ScreenPayload } from '@/types/Payload';
import DumpItem from '@/components/dumps/DumpItem.vue';
import WelcomePage from '@/components/app/WelcomePage.vue';
import Screens from '@/components/screen/Screens.vue';
import DumpLivewire from '@/components/laravel/DumpLivewire.vue';
import ScreenWindow from '@/components/screen/ScreenWindow.vue';
import { usePayloadStore } from '@/store/payload';
import { useSettingsStore } from '@/store/settings';
import XDebugMode from '@/components/xdebug/XDebugMode.vue';
import { useXDebug } from '@/store/xdebug';
import JobView from '@/components/laravel/JobView.vue';
import { useJobStore } from '@/store/jobs';
import { useMailStore } from '@/store/mail';
import MailView from '@/components/laravel/MailView.vue';
import { useLogStore } from '@/store/logs';
import LogView from '@/components/laravel/LogView.vue';
import { useQueriesPayloadStore } from '@/store/queries';
import { useBrainStore } from '@/store/brains';
import { useLivewireStore } from '@/store/livewire';
import { useQueriesBlockedStore } from '@/store/queries-blocked';
import { useQueryDuplicated } from '@/store/query-duplicated';
import { usePauseQueriesStore } from '@/store/pause-queries';
import { useFormattedQueriesStore } from '@/store/formatted-queries';
import QueriesView from '@/components/laravel/QueriesView.vue';
import { deepClone } from '@/lib/deep_clone';
import { useSavedDumpsStore } from '@/store/saved-dumps';
import { usePausePayloadStore } from '@/store/pause';
import { usePendingRequestsStore } from '@/store/pending-requests';
import { useCurrentProject } from '@/store/current-project';
import SvgEmpty from '@/components/svg/SvgEmpty.vue';
import { Environment } from '../../main/storage';
import { usePauseJobsStore } from '@/store/pause-jobs';
import { usePauseLogsStore } from '@/store/pause-logs';
import dayjs from 'dayjs';
import HeaderColorsFilter from '@/components/app/HeaderColorsFilter.vue';
import DropZones from '@/components/split/DropZones.vue';
import SplitPanes from '@/components/split/SplitPanes.vue';
import { useSplitPanesStore } from '@/store/split-panes';
import BrainView from '@/components/laravel/BrainView.vue';
import { ClockIcon } from '@heroicons/vue/24/outline';
import { isSpecialEnvironment } from '@/constants';

const xDebugStore = useXDebug();
const screenStore = useScreenStore();
const timeStore = useTimeStore();
const colorStore = useColorStore();
const globalSearchStore = useGlobalSearchStore();
const payloadStore = usePayloadStore();
const settingsStore = useSettingsStore();
const logStore = useLogStore();
const queriesStore = useQueriesPayloadStore();
const pausePayloadStore = usePausePayloadStore();
const pauseLogsStore = usePauseLogsStore();
const livewireStore = useLivewireStore();
const splitPanesStore = useSplitPanesStore();
const brainStore = useBrainStore();

const { locale } = useI18n({ useScope: 'global' });
const localeStore = useI18nStore();
const jobStore = useJobStore();
const mailStore = useMailStore();
const pendingRequestsStore = usePendingRequestsStore();
const blockedStore = useQueriesBlockedStore();
const pauseQueries = usePauseQueriesStore();
const currentProjectStore = useCurrentProject();
const pauseJobsStore = usePauseJobsStore();
const savedStore = useSavedDumpsStore();

const defaultScreen = ref({
    screen_name: 'home',
    raise_in: 0,
    visible: true,
    pinned: false,
    new_window: false
});

const environments = ref<Environment[]>([]);
const yamlConfig = ref<Record<string, any>>({});

const inScreenWindow = ref('');
const payloadScreen = ref([]);
const jobScreen = ref({});
const mailScreen = ref([]);
const logScreen = ref({});
const queriesScreen = ref([]);
const brainScreen = ref({});
const applicationPath = ref('');

const xdebugMode = ref(false);
const isDraggingScreen = ref(false);
const draggedScreenName = ref('');
const sfDump = ref(false);

watch(
    () => currentProjectStore.projectInfo,
    (newProject, oldProject) => {
        if (newProject && newProject.path !== oldProject?.path) {
            environments.value.forEach((env) => {
                if (!isSpecialEnvironment(env.value)) {
                    screenStore.remove(env.value);
                    payloadStore.clear(env.value);
                }
            });
            environments.value = [];

            window.ipcRenderer.send('storage.get-yaml', newProject.path);
        }
    }
);

onBeforeMount(() => {
    locale.value = localeStore.value;
});

onBeforeUnmount(() => {
    clearListeners();
});

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

const handleXdebugConnected = (_: any, arg: any) => {
    xdebugMode.value = true;
};

const handleXdebugDisconnected = (_: any, arg: any) => {
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
        yamlConfig.value = {
            ...yamlConfig.value,
            [section]: values
        };
    }
};

const handleEnvironmentSelected = async (environment: Environment) => {
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
};

const handleSavedDumpsRemove = (_: any, args: any) => {
    const { id } = args || {};
    if (!id) return;

    if (pausePayloadStore.is_paused) {
        return;
    }

    savedStore.remove(id);

    const updated = deepClone(savedStore.all);

    window.ipcRenderer.send('send-screen-window-update', {
        screen: 'saved',
        payload: updated
    });
};

const handleLivewire = (_: any, { content }: any) => {
    if (pausePayloadStore.is_paused) {
        return;
    }

    if (content.application_path && applicationPath.value != content.application_path) {
        window.ipcRenderer.send('storage.check', {
            applicationPath: content.application_path
        });
        applicationPath.value = content.application_path;
    }

    livewireStore.add(content.livewire);
    dispatch(content);
};

const handleJobs = (_: any, { content }: any) => {
    if (pauseJobsStore.is_paused) {
        return;
    }

    if (content.application_path && applicationPath.value != content.application_path) {
        window.ipcRenderer.send('storage.check', {
            applicationPath: content.application_path
        });
        applicationPath.value = content.application_path;
    }

    jobStore.addOrUpdateJob(content);

    const serializableJobs = deepClone(jobStore.jobs);

    if (content.to_screen.new_window) {
        screenStore.hidden(content.to_screen.screen_name);

        window.ipcRenderer.send('screen-window:show', {
            screen: content.to_screen.screen_name,
            payload: {},
            jobs: serializableJobs,
            position: {}
        });
    }

    if (content.to_screen && !content.to_screen.new_window) {
        window.ipcRenderer.send('send-screen-window-update', {
            screen: content.to_screen.screen_name,
            payload: {},
            jobs: serializableJobs
        });
    }
};

const handleHtml = (_: any, { content }: any) => {
    if (pausePayloadStore.is_paused) {
        return;
    }
    dispatch(content);
};

const handleMailable = (_: any, { content }: any) => {
    if (pausePayloadStore.is_paused) {
        return;
    }
    dispatch(content);
};

const handleTableV2 = (_: any, { content }: any) => {
    if (pausePayloadStore.is_paused) {
        return;
    }
    dispatch(content);
};

const handleTable = (_: any, { content }: any) => {
    if (pausePayloadStore.is_paused) {
        return;
    }
    dispatch(content);
};

const handleHttpClient = (_: any, { content }: any) => {
    if (pausePayloadStore.is_paused) {
        return;
    }
    dispatch(content);
};

const handleModel = (_: any, { content }: any) => {
    if (pausePayloadStore.is_paused) {
        return;
    }
    dispatch(content);
};
const handleJson = (_: any, { content }: any) => {
    if (pausePayloadStore.is_paused) {
        return;
    }
    dispatch(content);
};

const handleQuery = (_: any, { content }: any) => {
    if (pausePayloadStore.is_paused) {
        return;
    }
    dispatch(content);
};

const handleMail = (_: any, { content }: any) => {
    if (pausePayloadStore.is_paused) {
        return;
    }

    if (content.application_path && applicationPath.value != content.application_path) {
        window.ipcRenderer.send('storage.check', {
            applicationPath: content.application_path
        });
        applicationPath.value = content.application_path;
    }

    mailStore.addOrUpdateMail(content.mail, content.ide_handle, content.context);
};

const handleLabel = (_: any, { content }: any) => {
    if (pausePayloadStore.is_paused) {
        return;
    }

    payloadStore.updateLabelPayload(content);
};

const handleContext = (_: any, { content }: any) => {
    if (pausePayloadStore.is_paused) {
        return;
    }

    payloadStore.updatePayload(content, 'context');
};

const handleLogApplication = (_: any, { content }: any) => {
    if (pausePayloadStore.is_paused || pauseLogsStore.is_paused) {
        return;
    }

    if (content.application_path && applicationPath.value != content.application_path) {
        window.ipcRenderer.send('storage.check', {
            applicationPath: content.application_path
        });
        applicationPath.value = content.application_path;
    }

    logStore.add(content);

    const serializable = deepClone(logStore.logs);

    if (content.to_screen.new_window) {
        screenStore.hidden(content.to_screen.screen_name);

        window.ipcRenderer.send('screen-window:show', {
            screen: content.to_screen.screen_name,
            payload: {},
            logs: serializable,
            position: {}
        });
    }

    if (content.to_screen && !content.to_screen.new_window) {
        window.ipcRenderer.send('send-screen-window-update', {
            screen: content.to_screen.screen_name,
            payload: {},
            logs: serializable
        });
    }
};

const handleColor = async (_: any, { content }: any) => {
    if (pausePayloadStore.is_paused) {
        return;
    }

    payloadStore.updateColorPayload(content);
};

const handleScreen = (_: any, { content }: any) => {
    if (pausePayloadStore.is_paused) {
        return;
    }

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
    if (pausePayloadStore.is_paused) {
        return;
    }

    payloadStore.updateJSONValidatePayload(content);
};

const handleValidate = (_: any, { content }: any) => {
    if (pausePayloadStore.is_paused) {
        return;
    }

    payloadStore.updateValidatePayload(content);
};

let lastPayloadTimeout: NodeJS.Timeout | null = null;
let lastPayloadReceivedTime = 0;

const handleDumpBatches = (_, args) => {
    if (pauseQueries.is_paused) {
        return;
    }

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

            if (content.application_path && applicationPath.value != content.application_path) {
                window.ipcRenderer.send('storage.check', {
                    applicationPath: content.application_path
                });
                applicationPath.value = content.application_path;
            }

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
    if (pausePayloadStore.is_paused) {
        return;
    }

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
    if (pausePayloadStore.is_paused) {
        return;
    }

    if (content.application_path && applicationPath.value != content.application_path) {
        window.ipcRenderer.send('storage.check', {
            applicationPath: content.application_path
        });
        applicationPath.value = content.application_path;
    }

    brainStore.addOrUpdateBrain(content);

    const serializableBrains = deepClone(brainStore.brains);

    if (content.to_screen?.new_window) {
        screenStore.hidden(content.to_screen.screen_name);

        window.ipcRenderer.send('screen-window:show', {
            screen: content.to_screen.screen_name,
            payload: {},
            brains: serializableBrains,
            position: {}
        });
    }

    if (content.to_screen && !content.to_screen.new_window) {
        window.ipcRenderer.send('send-screen-window-update', {
            screen: content.to_screen.screen_name,
            payload: {},
            brains: serializableBrains
        });
    }
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

onMounted(() => {
    if (xDebugStore.current) {
        xdebugMode.value = typeof xDebugStore.current.project_path !== 'undefined';
    }

    addScreen(defaultScreen.value);

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
});

const dumpListeners = () => {
    window.ipcRenderer.on('livewire', handleLivewire);
    window.ipcRenderer.on('jobs', handleJobs);
    window.ipcRenderer.on('html', handleHtml);
    window.ipcRenderer.on('mailable', handleMailable);
    window.ipcRenderer.on('table_v2', handleTableV2);
    window.ipcRenderer.on('table', handleTable);
    window.ipcRenderer.on('http-client', handleHttpClient);
    window.ipcRenderer.on('model', handleModel);
    window.ipcRenderer.on('json', handleJson);
    window.ipcRenderer.on('query', handleQuery);
    window.ipcRenderer.on('mail', handleMail);
    window.ipcRenderer.on('label', handleLabel);
    window.ipcRenderer.on('context', handleContext);
    window.ipcRenderer.on('log_application', handleLogApplication);
    window.ipcRenderer.on('color', handleColor);
    window.ipcRenderer.on('screen', handleScreen);
    window.ipcRenderer.on('json_validate', handleJsonValidate);
    window.ipcRenderer.on('validate', handleValidate);
    window.ipcRenderer.on('dump.batches', handleDumpBatches);
    window.ipcRenderer.on('time_track', handleTimeTrack);
    window.ipcRenderer.on('brain', handleBrain);
};

const clearDumpListeners = () => {
    window.ipcRenderer.off('livewire', handleLivewire);
    window.ipcRenderer.off('jobs', handleJobs);
    window.ipcRenderer.off('html', handleHtml);
    window.ipcRenderer.off('mailable', handleMailable);
    window.ipcRenderer.off('table_v2', handleTableV2);
    window.ipcRenderer.off('table', handleTable);
    window.ipcRenderer.off('http-client', handleHttpClient);
    window.ipcRenderer.off('model', handleModel);
    window.ipcRenderer.off('json', handleJson);
    window.ipcRenderer.off('query', handleQuery);
    window.ipcRenderer.off('mail', handleMail);
    window.ipcRenderer.off('label', handleLabel);
    window.ipcRenderer.off('context', handleContext);
    window.ipcRenderer.off('log_application', handleLogApplication);
    window.ipcRenderer.off('color', handleColor);
    window.ipcRenderer.off('screen', handleScreen);
    window.ipcRenderer.off('json_validate', handleJsonValidate);
    window.ipcRenderer.off('validate', handleValidate);
    window.ipcRenderer.off('dump.batches', handleDumpBatches);
    window.ipcRenderer.off('time_track', handleTimeTrack);
    window.ipcRenderer.off('brain', handleBrain);
};

const dumpsBagFiltered = computed((): Payload[] => {
    return payloadStore.filteredPayload
        .filter(
            (dump: Payload) =>
                dump.content?.toLowerCase().includes(globalSearchStore.search.toLowerCase()) ||
                JSON.stringify(dump.with_label)?.toLowerCase().includes(globalSearchStore.search.toLowerCase())
        )
        .filter((dump: Payload) => {
            if (colorStore.colors.length > 0 && dump.color) {
                return colorStore.colors.includes(dump.color);
            }
            return true;
        });
});

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
        if (!['jobs', 'mail', 'logs', 'queries'].includes(screenStore.screen)) {
            document.getElementById(settingsStore.settings.scroll_direction)?.scrollIntoView({ behavior: 'smooth' });
        }
    });
};

const dispatch = (content: any): void => {
    if (pausePayloadStore.is_paused) {
        return;
    }

    content.rendered = false;

    if (content.application_path && applicationPath.value != content.application_path) {
        window.ipcRenderer.send('storage.check', {
            applicationPath: content.application_path
        });
        applicationPath.value = content.application_path;
    }

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
        screenStore.hidden(content.to_screen.screen_name);

        window.ipcRenderer.send('screen-window:show', {
            screen: content.to_screen.screen_name,
            payload: serializablePayload,
            position: {}
        });
    } else {
        window.ipcRenderer.send('send-screen-window-update', {
            screen: content.to_screen.screen_name,
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

const openScreenWindow = (targetScreen?: string) => {
    const screen = targetScreen ?? screenStore.screen;

    screenStore.toggleVisible(screen);

    const serializablePayload = deepClone(payloadStore.get(screen));
    const serializableJobPayload = deepClone(jobStore.jobs);
    const serializableMailPayload = deepClone(mailStore.mails);
    const serializableLogPayload = deepClone(logStore.logs);
    const serializableQueriesPayload = deepClone(queriesStore.payload);
    const serializableBrainsPayload = deepClone(brainStore.brains);

    window.ipcRenderer.send('screen-window:show', {
        screen,
        payload: serializablePayload,
        jobs: serializableJobPayload,
        mails: serializableMailPayload,
        logs: serializableLogPayload,
        queries: serializableQueriesPayload,
        brains: serializableBrainsPayload,
        position: {}
    });

    setTimeout(() => {
        const next = screen === 'home' ? screenStore.getNext('home').screen_name : 'home';
        toggleScreen(next);
    }, 200);
};

const groupedDumps = computed(() => {
    if (!settingsStore.settings.grouped_by_time) {
        return { ungrouped: dumpsBagFiltered.value };
    }

    return dumpsBagFiltered.value.reduce(
        (groups, payload) => {
            const groupKey = dayjs(payload.date_time).format('YYYY-MM-DD HH:mm:ss');
            if (!groups[groupKey]) {
                groups[groupKey] = [];
            }
            groups[groupKey].push(payload);
            return groups;
        },
        {} as Record<string, Payload[]>
    );
});

const groupedSplitDumps = computed(() => {
    if (!splitPanesStore.splitConfig?.screenName) {
        return {};
    }

    const screenPayloads = payloadStore.get(splitPanesStore.splitConfig.screenName);

    if (!settingsStore.settings.grouped_by_time) {
        return { ungrouped: screenPayloads };
    }

    return screenPayloads.reduce(
        (groups, payload) => {
            const groupKey = dayjs(payload.date_time).format('YYYY-MM-DD HH:mm:ss');
            if (!groups[groupKey]) {
                groups[groupKey] = [];
            }
            groups[groupKey].push(payload);
            return groups;
        },
        {} as Record<string, Payload[]>
    );
});

const hasColorsInPayload = computed((): boolean => {
    return payloadStore.payload.some((payload: Payload) => payload.color && payload.color !== 'gray');
});

const handleDragScreen = ({ screen, _ }) => {
    draggedScreenName.value = screen;
    isDraggingScreen.value = true;
};

const handleDropZone = (zone: 'right' | 'bottom') => {
    if (!draggedScreenName.value) {
        return;
    }

    const orientation = zone === 'right' ? 'vertical' : 'horizontal';

    splitPanesStore.setSplit(draggedScreenName.value, orientation);
    settingsStore.setSplitPaneScreen(draggedScreenName.value);

    if (screenStore.screen === draggedScreenName.value) {
        const nextScreen = screenStore.getNext(draggedScreenName.value);
        if (nextScreen) {
            toggleScreen(nextScreen.screen_name, true);
        }
    }

    isDraggingScreen.value = false;
    draggedScreenName.value = '';
};

const handleCloseSplit = () => {
    splitPanesStore.clearSplit();
    settingsStore.setSplitPaneScreen(null);
};

const handleDragEnd = () => {
    setTimeout(() => {
        if (isDraggingScreen.value) {
            isDraggingScreen.value = false;
            draggedScreenName.value = '';
        }
    }, 100);
};
</script>
<template>
    <div
        :class="{ absolute: !inScreenWindow }"
        class="flex overflow-hidden flex-col flex-1 right-0 left-0 h-fill-available"
        @dragend="handleDragEnd"
    >
        <DropZones
            :is-dragging="isDraggingScreen"
            @drop="handleDropZone"
        />

        <div
            v-if="inScreenWindow"
            class="mt-3 h-[calc(100vh-50px)] w-screen text-base"
        >
            <ScreenWindow
                v-if="!['jobs', 'mail', 'logs', 'queries', 'brain'].includes(inScreenWindow)"
                v-model:dumps="payloadScreen"
                v-model:screen="inScreenWindow"
            />

            <JobView
                :in-screen-window="inScreenWindow.length > 0"
                v-if="inScreenWindow === 'jobs'"
                :items="jobScreen"
            />

            <BrainView
                :in-screen-window="inScreenWindow.length > 0"
                v-if="inScreenWindow === 'brain'"
                :items="brainScreen"
            />

            <MailView
                :in-screen-window="inScreenWindow.length > 0"
                v-if="inScreenWindow === 'mail'"
                :items="mailScreen"
            />

            <LogView
                :in-screen-window="inScreenWindow.length > 0"
                v-if="inScreenWindow === 'logs'"
                :items="logScreen"
                :yaml-config="yamlConfig"
            />
        </div>

        <div v-else>
            <XDebugMode v-if="xdebugMode && xDebugStore.current && xDebugStore.current.project_path" />

            <div v-else>
                <div
                    v-if="splitPanesStore.splitConfig?.active"
                    class="fixed inset-0 top-10.25 flex flex-col"
                >
                    <SplitPanes
                        :orientation="splitPanesStore.splitConfig.orientation"
                        @close="handleCloseSplit"
                    >
                        <template #pane-a>
                            <div class="flex flex-col h-full">
                                <div class="shrink-0 z-380">
                                    <div class="flex h-12 p-1.5 items-center justify-between w-full">
                                        <Screens
                                            class="flex-1 min-w-0"
                                            :environments="environments"
                                            @toggleScreen="toggleScreen"
                                            @dragScreen="handleDragScreen"
                                            @environmentSelected="handleEnvironmentSelected"
                                            @removeEnvironmentScreen="handleRemoveEnvironmentScreen"
                                            @openScreenWindow="openScreenWindow"
                                        />
                                    </div>
                                </div>

                                <div class="flex-1 overflow-auto min-h-0">
                                    <div v-if="screenStore.screen === 'jobs'">
                                        <JobView />
                                    </div>

                                    <div v-else-if="screenStore.screen === 'brain'">
                                        <BrainView />
                                    </div>

                                    <div v-else-if="screenStore.screen === 'mail'">
                                        <MailView />
                                    </div>

                                    <div v-else-if="screenStore.screen === 'logs'">
                                        <LogView :yaml-config="yamlConfig" />
                                    </div>

                                    <div v-else-if="screenStore.screen === 'queries'">
                                        <QueriesView :yaml-config="yamlConfig" />
                                    </div>

                                    <div
                                        v-else
                                        class="flex flex-col rounded-sm text-base w-full h-full"
                                    >
                                        <!--                                        <HeaderColorsFilter v-if="hasColorsInPayload" />-->

                                        <div id="top"></div>

                                        <div class="w-full">
                                            <div
                                                id="dumps-base"
                                                class="w-full mb-10"
                                                v-if="payloadStore.payload.length > 0"
                                                :class="{
                                                    'flex flex-col-reverse':
                                                        settingsStore.settings.dump_order === 'normal'
                                                }"
                                            >
                                                <div
                                                    v-for="(group, groupKey) in groupedDumps"
                                                    :key="groupKey"
                                                    class="w-full"
                                                >
                                                    <div
                                                        v-if="
                                                            !['livewire'].includes(screenStore.screen) &&
                                                            settingsStore.settings.grouped_by_time
                                                        "
                                                        class="bg-base-200 flex-1 text-left pt-0 py-1.5 z-300 text-xs sticky top-0"
                                                    >
                                                        <span
                                                            class="flex items-center gap-1 opacity-70"
                                                            :title="groupKey"
                                                        >
                                                            <ClockIcon class="w-3 h-3" />
                                                            {{ dayjs(groupKey).format('HH:mm:ss') }}
                                                        </span>
                                                    </div>

                                                    <div
                                                        v-for="(payload, index) in settingsStore.settings.dump_order ===
                                                        'normal'
                                                            ? group.slice().reverse()
                                                            : group"
                                                        :key="payload.sf_dump_id"
                                                        :id="payload.id"
                                                        class="w-full"
                                                    >
                                                        <DumpItem
                                                            class="w-full group text-sm"
                                                            v-show="screenStore.screen !== 'livewire'"
                                                            :payload="payload"
                                                            :show-time="!settingsStore.settings.grouped_by_time"
                                                            :is-first="index === 0"
                                                        />
                                                    </div>
                                                </div>

                                                <DumpLivewire v-if="screenStore.screen === 'livewire'" />
                                            </div>

                                            <div
                                                v-if="
                                                    dumpsBagFiltered.length === 0 &&
                                                    !['jobs', 'mail', 'logs', 'queries', 'home'].includes(
                                                        screenStore.screen
                                                    )
                                                "
                                                class="flex items-center justify-center w-full h-full py-20"
                                            >
                                                <div class="text-center">
                                                    <SvgEmpty class="w-30 opacity-25 mx-auto" />
                                                    <div class="text-base-content/70">
                                                        <h1 class="text-lg font-semibold mb-2">Empty</h1>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div id="bottom"></div>

                                        <WelcomePage
                                            v-if="payloadStore.payload.length === 0 && screenStore.screen === 'home'"
                                            class="w-full h-full"
                                        />
                                    </div>
                                </div>
                            </div>
                        </template>

                        <template #pane-b>
                            <div class="flex flex-col h-full overflow-hidden">
                                <div class="shrink-0 h-12 px-3 py-1.5 items-center justify-between flex">
                                    <h2 class="text-sm font-semibold capitalize">
                                        {{ splitPanesStore.splitConfig.screenName }}
                                    </h2>
                                    <button
                                        @click="handleCloseSplit"
                                        class="btn border border-base-content/5 btn-sm p-2 btn-circle btn-soft z-9999"
                                        aria-label="Close split"
                                        title="Close split"
                                    >
                                        <svg
                                            class="w-4 h-4"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                                stroke-width="2"
                                                d="M6 18L18 6M6 6l12 12"
                                            ></path>
                                        </svg>
                                    </button>
                                </div>

                                <div class="flex-1 overflow-auto min-h-0">
                                    <div v-if="splitPanesStore.splitConfig.screenName === 'jobs'">
                                        <JobView @open-screen-window="openScreenWindow" />
                                    </div>

                                    <div v-else-if="splitPanesStore.splitConfig.screenName === 'brain'">
                                        <BrainView @open-screen-window="openScreenWindow" />
                                    </div>

                                    <div v-else-if="splitPanesStore.splitConfig.screenName === 'mail'">
                                        <MailView @open-screen-window="openScreenWindow" />
                                    </div>

                                    <div v-else-if="splitPanesStore.splitConfig.screenName === 'logs'">
                                        <LogView
                                            :yaml-config="yamlConfig"
                                            @open-screen-window="openScreenWindow"
                                        />
                                    </div>

                                    <div v-else-if="splitPanesStore.splitConfig.screenName === 'queries'">
                                        <QueriesView
                                            :yaml-config="yamlConfig"
                                            @open-screen-window="openScreenWindow"
                                        />
                                    </div>

                                    <div
                                        v-else
                                        class="px-3"
                                    >
                                        <div
                                            v-if="payloadStore.get(splitPanesStore.splitConfig.screenName).length === 0"
                                            class="flex items-center justify-center h-full py-20"
                                        >
                                            <div class="text-center">
                                                <SvgEmpty class="w-30 opacity-25 mx-auto" />
                                                <div class="text-base-content/70">
                                                    <h1 class="text-lg font-semibold mb-2">Empty</h1>
                                                </div>
                                            </div>
                                        </div>

                                        <div
                                            v-else
                                            :class="{
                                                'flex flex-col-reverse': settingsStore.settings.dump_order === 'normal'
                                            }"
                                        >
                                            <div
                                                v-for="(group, groupKey) in groupedSplitDumps"
                                                :key="groupKey"
                                                class="w-full"
                                            >
                                                <div
                                                    v-if="
                                                        !['livewire'].includes(
                                                            splitPanesStore.splitConfig.screenName
                                                        ) && settingsStore.settings.grouped_by_time
                                                    "
                                                    class="bg-base-200 flex-1 text-left pt-0 py-1.5 z-300 text-xs sticky top-0"
                                                >
                                                    <span
                                                        class="flex items-center gap-1 opacity-70"
                                                        :title="groupKey"
                                                    >
                                                        <ClockIcon class="w-3 h-3" />
                                                        {{ dayjs(groupKey).format('HH:mm:ss') }}
                                                    </span>
                                                </div>

                                                <div
                                                    v-for="(payload, index) in settingsStore.settings.dump_order ===
                                                    'normal'
                                                        ? group.slice().reverse()
                                                        : group"
                                                    :key="payload.sf_dump_id"
                                                    class="w-full mb-3"
                                                >
                                                    <DumpItem
                                                        class="w-full group text-sm"
                                                        :payload="payload"
                                                        :show-time="!settingsStore.settings.grouped_by_time"
                                                        :is-first="index === 0"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </template>
                    </SplitPanes>
                </div>

                <div v-else>
                    <div class="flex flex-col flex-1 absolute inset-0 overflow-hidden">
                        <main class="flex flex-col flex-1 min-h-full space-y-1">
                            <div class="flex z-50">
                                <div class="flex h-12 p-1.5 items-center justify-between w-full">
                                    <Screens
                                        class="flex-1 min-w-0"
                                        :environments="environments"
                                        @toggleScreen="toggleScreen"
                                        @dragScreen="handleDragScreen"
                                        @environmentSelected="handleEnvironmentSelected"
                                        @removeEnvironmentScreen="handleRemoveEnvironmentScreen"
                                        @openScreenWindow="openScreenWindow"
                                    />
                                </div>
                            </div>

                            <div v-if="screenStore.screen === 'jobs'">
                                <JobView
                                    class="w-screen text-base"
                                    @open-screen-window="openScreenWindow"
                                />
                            </div>

                            <div v-if="screenStore.screen === 'mail'">
                                <MailView
                                    class="w-screen text-base"
                                    @open-screen-window="openScreenWindow"
                                />
                            </div>

                            <div v-if="screenStore.screen === 'logs'">
                                <LogView
                                    class="w-screen text-base"
                                    :yaml-config="yamlConfig"
                                    @open-screen-window="openScreenWindow"
                                />
                            </div>

                            <div v-if="screenStore.screen === 'queries'">
                                <QueriesView
                                    class="text-base"
                                    :yaml-config="yamlConfig"
                                    @open-screen-window="openScreenWindow"
                                />
                            </div>

                            <div v-if="screenStore.screen === 'brain'">
                                <BrainView
                                    class="w-screen text-base"
                                    @open-screen-window="openScreenWindow"
                                />
                            </div>

                            <div
                                v-else
                                :class="{
                                    'items-center': payloadStore.payload.length === 0,
                                    'h-[calc(100vh-90px)]': true
                                }"
                                class="flex flex-col rounded-sm text-base w-screen overflow-auto"
                            >
                                <!--  <HeaderColorsFilter v-if="hasColorsInPayload" />-->

                                <div id="top"></div>

                                <div
                                    :class="{
                                        'w-full': dumpsBagFiltered.length === 0 && screenStore.screen !== 'home'
                                    }"
                                >
                                    <div
                                        id="dumps-base"
                                        class="w-full mb-10"
                                        v-if="payloadStore.payload.length > 0"
                                        :class="{
                                            'flex flex-col-reverse': settingsStore.settings.dump_order === 'normal'
                                        }"
                                    >
                                        <div
                                            v-for="(group, groupKey, index) in groupedDumps"
                                            :key="groupKey"
                                            class="w-full"
                                            :class="{
                                                '-mt-1': index === 0
                                            }"
                                        >
                                            <div
                                                v-if="
                                                    !['livewire'].includes(screenStore.screen) &&
                                                    settingsStore.settings.grouped_by_time
                                                "
                                                class="bg-base-200 flex-1 text-left p-3 z-300 text-xs sticky -top-2"
                                            >
                                                <span
                                                    class="flex items-center gap-1 opacity-70"
                                                    :title="groupKey"
                                                >
                                                    <ClockIcon class="w-3 h-3" />
                                                    {{ dayjs(groupKey).format('HH:mm:ss') }}
                                                </span>
                                            </div>

                                            <div
                                                v-for="(payload, index) in settingsStore.settings.dump_order ===
                                                'normal'
                                                    ? group.slice().reverse()
                                                    : group"
                                                :key="payload.sf_dump_id"
                                                :id="payload.id"
                                                class="w-full"
                                                :class="{
                                                    '-mt-3': settingsStore.settings.grouped_by_time && index === 0
                                                }"
                                            >
                                                <DumpItem
                                                    class="w-full group text-sm"
                                                    v-show="screenStore.screen !== 'livewire'"
                                                    :payload="payload"
                                                    :show-time="!settingsStore.settings.grouped_by_time"
                                                    :is-first="index === 0"
                                                />
                                            </div>
                                        </div>

                                        <DumpLivewire v-if="screenStore.screen === 'livewire'" />
                                    </div>

                                    <div
                                        v-if="
                                            dumpsBagFiltered.length === 0 &&
                                            !['jobs', 'mail', 'logs', 'queries', 'home'].includes(screenStore.screen)
                                        "
                                        class="-mt-22.5 -ml-8 absolute flex items-center justify-center w-full pointer-events-none"
                                        style="height: -webkit-fill-available"
                                    >
                                        <SvgEmpty class="w-30 opacity-25" />
                                        <div class="text-base-content/70">
                                            <h1 class="text-lg font-semibold mb-2">Empty</h1>
                                        </div>
                                    </div>
                                </div>

                                <div id="bottom"></div>

                                <WelcomePage
                                    v-if="payloadStore.payload.length === 0 && screenStore.screen === 'home'"
                                    class="w-full h-full"
                                />
                            </div>
                        </main>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
