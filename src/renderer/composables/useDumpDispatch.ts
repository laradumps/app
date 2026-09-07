import { ref } from 'vue';
import { nextTick } from 'vue';
import type { IpcRendererEvent } from 'electron';
import { usePayloadStore } from '@/store/payload';
import { useScreenStore } from '@/store/screen';
import { useSettingsStore } from '@/store/settings';
import { useTimeStore } from '@/store/time';
import { useJobStore } from '@/store/jobs';
import { useMailStore } from '@/store/mail';
import { useLogStore } from '@/store/logs';
import { useBrainStore } from '@/store/brains';
import { useLivewireStore } from '@/store/livewire';
import { useProfileStore } from '@/store/profile';
import { useQueriesPayloadStore } from '@/store/queries';
import { useQueriesBlockedStore } from '@/store/queries-blocked';
import { usePendingRequestsStore } from '@/store/pending-requests';
import { useCurrentProject } from '@/store/current-project';
import { useSplitPanesStore } from '@/store/split-panes';
import { useToastStore } from '@/store/toast';
import {
    usePausePayloadStore,
    usePauseJobsStore,
    usePauseLogsStore,
    usePauseQueriesStore,
    usePauseProfileStore
} from '@/store/pauses';
import { Payload } from '@/types/Payload';
import { deepClone } from '@/utils/deep_clone';
import { checkApplicationPath, sendToScreenWindow, openNewScreenWindow } from '@/utils/ipc';
import { ipc } from '@/ipc/client';
import type { ScreenNavigation } from '@/composables/useScreenNavigation';

type IpcHandler = (event: IpcRendererEvent, ...args: any[]) => void;

type BatchArgs = { type?: string; contents?: { content: Payload }[] };

const NON_SCROLLING_SCREENS = ['jobs', 'mail', 'logs', 'queries', 'tail_logs'];

/**
 * Dump/payload domain: the `dispatch` pipeline, pause gating, badge/limit rules,
 * screen-window fan-out and every content channel handler. Depends on screen
 * navigation only for adding/toggling screens.
 */
export function useDumpDispatch(nav: ScreenNavigation) {
    const payloadStore = usePayloadStore();
    const screenStore = useScreenStore();
    const settingsStore = useSettingsStore();
    const timeStore = useTimeStore();
    const jobStore = useJobStore();
    const mailStore = useMailStore();
    const logStore = useLogStore();
    const brainStore = useBrainStore();
    const livewireStore = useLivewireStore();
    const profileStore = useProfileStore();
    const queriesStore = useQueriesPayloadStore();
    const blockedStore = useQueriesBlockedStore();
    const pendingRequestsStore = usePendingRequestsStore();
    const currentProjectStore = useCurrentProject();
    const splitPanesStore = useSplitPanesStore();
    const toastStore = useToastStore();
    const pausePayloadStore = usePausePayloadStore();
    const pauseJobsStore = usePauseJobsStore();
    const pauseLogsStore = usePauseLogsStore();
    const pauseQueries = usePauseQueriesStore();
    const pauseProfileStore = usePauseProfileStore();

    const applicationPath = ref('');

    const maximizeApp = (autoInvokeApp: string | boolean): void => {
        autoInvokeApp && ipc.send('main:show');
    };

    const dispatch = (content: any): void => {
        if (pausePayloadStore.is_paused) return;

        content.rendered = false;

        checkApplicationPath(content, applicationPath);

        if (!content.hasOwnProperty('to_screen')) {
            toastStore.show('Received a malformed payload. Please update the app and laradumps-core.', 'error', 4000);
            return;
        }

        if (content.to_screen && typeof content.to_screen.screen_name == 'string') {
            nav.addScreen(content.to_screen);
        }

        if (settingsStore.settings.show_badge_count) {
            content.show_badge_count = true;
        }

        content.color = content.color || 'gray';
        content.projectInfo = currentProjectStore.projectInfo;

        const limit = settingsStore.settings.limit_dumps || 500;
        payloadStore.add(content, screenStore.screen, limit);

        maximizeApp(content.auto_invoke_app);

        if (content.to_screen?.screen_name) {
            const serializablePayload = deepClone(
                payloadStore.payload.filter(
                    (payload: Payload) => payload.to_screen?.screen_name === content.to_screen.screen_name
                )
            );

            if (content.to_screen.new_window) {
                openNewScreenWindow(screenStore, content.to_screen.screen_name, { payload: serializablePayload });
            } else {
                sendToScreenWindow(content.to_screen.screen_name, { payload: serializablePayload });
            }
        }

        if (splitPanesStore.splitConfig?.active) {
            const paneAScreen = screenStore.screen;
            const targetScreen = content.to_screen.screen_name;

            nextTick(() => {
                nav.toggleScreen(targetScreen, false);
                setTimeout(() => nav.toggleScreen(paneAScreen, true), 100);
            });

            return;
        }

        if (content.to_screen?.screen_name === screenStore.screen) {
            nextTick(() => {
                if (!NON_SCROLLING_SCREENS.includes(screenStore.screen)) {
                    document
                        .getElementById(settingsStore.settings.scroll_direction)
                        ?.scrollIntoView({ behavior: 'auto' });
                }
            });
        }
    };

    // One shape for the store-backed screen channels (jobs/logs/brain/profiler):
    // pause-guard, apply to the store, then fan the fresh snapshot out to any
    // detached window.
    const makeScreenHandler = (opts: {
        paused: () => boolean;
        apply: (content: Payload) => void;
        snapshot: () => any;
        key: 'jobs' | 'logs' | 'brains' | 'profiles';
    }): IpcHandler => {
        return (_e, { content }: { content: Payload }) => {
            if (opts.paused()) return;
            checkApplicationPath(content, applicationPath);
            opts.apply(content);

            if (!content.to_screen) return;

            const data = { payload: {}, [opts.key]: deepClone(opts.snapshot()) };
            if (content.to_screen.new_window) {
                openNewScreenWindow(screenStore, content.to_screen.screen_name, data);
            } else {
                sendToScreenWindow(content.to_screen.screen_name, data);
            }
        };
    };

    const passthroughHandler: IpcHandler = (_e, { content }: { content: Payload }) => dispatch(content);
    const handleDump: IpcHandler = (_e, { content }: { content: Payload }) => dispatch(content);
    const handleXdebug: IpcHandler = (_e, { content }: { content: Payload }) => dispatch(content);

    const handleLivewire: IpcHandler = (_e, { content }: { content: Payload }) => {
        if (pausePayloadStore.is_paused) return;
        checkApplicationPath(content, applicationPath);
        livewireStore.add(content.livewire);
        dispatch(content);
    };

    const handleJobs = makeScreenHandler({
        paused: () => pausePayloadStore.is_paused || pauseJobsStore.is_paused,
        apply: (content) => jobStore.addOrUpdateJob(content),
        snapshot: () => jobStore.jobs,
        key: 'jobs'
    });

    const handleLogApplication = makeScreenHandler({
        paused: () => pausePayloadStore.is_paused || pauseLogsStore.is_paused,
        apply: (content) => logStore.add(content),
        snapshot: () => logStore.logs,
        key: 'logs'
    });

    const handleBrain = makeScreenHandler({
        paused: () => pausePayloadStore.is_paused,
        apply: (content) => brainStore.addOrUpdateBrain(content),
        snapshot: () => brainStore.brains,
        key: 'brains'
    });

    const handleProfile = makeScreenHandler({
        paused: () => pausePayloadStore.is_paused || pauseProfileStore.is_paused,
        apply: (content) => {
            profileStore.addProfile(content);
            if (content.to_screen) nav.addScreen(content.to_screen);
        },
        snapshot: () => profileStore.profiles,
        key: 'profiles'
    });

    const handleMail: IpcHandler = (_e, { content }: { content: Payload }) => {
        if (pausePayloadStore.is_paused) return;
        checkApplicationPath(content, applicationPath);
        mailStore.addOrUpdateMail(content.mail, content.ide_handle, content.context, content.related_job);
    };

    const handleLabel: IpcHandler = (_e, { content }: { content: Payload }) => {
        if (pausePayloadStore.is_paused) return;
        payloadStore.updateLabelPayload(content);
    };

    const handleContext: IpcHandler = (_e, { content }: { content: Payload }) => {
        if (pausePayloadStore.is_paused) return;
        payloadStore.updatePayload(content, 'context');
    };

    const handleColor: IpcHandler = (_e, { content }: { content: Payload }) => {
        if (pausePayloadStore.is_paused) return;
        payloadStore.updateColorPayload(content);
    };

    const handleScreen: IpcHandler = (_e, { content }: { content: Payload }) => {
        if (pausePayloadStore.is_paused) return;
        payloadStore.updateScreenPayload(content);
        const screen = content.to_screen;
        nav.addScreen(screen);

        if (screenStore.get(screen.screen_name)?.pinned) {
            nav.toggleScreen(screen.screen_name, true);
        }

        if (screen.raise_in > 0) {
            setTimeout(() => nav.toggleScreen(screen.screen_name, true), screen.raise_in * 1000);
        }
    };

    const handleJsonValidate: IpcHandler = (_e, { content }: { content: Payload }) => {
        if (pausePayloadStore.is_paused) return;
        payloadStore.updateJSONValidatePayload(content);
    };

    const handleValidate: IpcHandler = (_e, { content }: { content: Payload }) => {
        if (pausePayloadStore.is_paused) return;
        payloadStore.updateValidatePayload(content);
    };

    let lastPayloadTimeout: ReturnType<typeof setTimeout> | null = null;
    let lastPayloadReceivedTime = 0;

    const handleDumpBatches: IpcHandler = (_e, args: BatchArgs) => {
        if (pausePayloadStore.is_paused || pauseQueries.is_paused) return;
        if (args.type !== 'batch' || !args.contents) return;

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
            nav.addScreen(content.to_screen);
        });

        lastPayloadTimeout = setTimeout(() => {
            if (Date.now() - lastPayloadReceivedTime >= 200) {
                const lastPayload: Payload = queriesStore.payload[queriesStore.payload.length - 1];
                if (lastPayload) {
                    timeStore.selected = lastPayload.request_id;
                }
            }
        }, 200);
    };

    const handleTimeTrack: IpcHandler = (_e, { content }: { content: Payload }) => {
        if (pausePayloadStore.is_paused) return;

        const exist = payloadStore.payload.filter(
            (globalPayload: Payload) => globalPayload.with_label?.label === content.with_label?.label
        );

        if (exist.length === 0) {
            dispatch(content);
            return;
        }

        payloadStore.updateTimeTrackPayload(content);
    };

    // Channel → handler map, consumed both to register and to tear down, so the
    // two directions can never drift apart.
    const DUMP_HANDLERS: Record<string, IpcHandler> = {
        livewire: handleLivewire,
        jobs: handleJobs,
        html: passthroughHandler,
        mailable: passthroughHandler,
        table_v2: passthroughHandler,
        table: passthroughHandler,
        'http-client': passthroughHandler,
        model: passthroughHandler,
        json: passthroughHandler,
        query: passthroughHandler,
        mail: handleMail,
        label: handleLabel,
        context: handleContext,
        log_application: handleLogApplication,
        color: handleColor,
        screen: handleScreen,
        json_validate: handleJsonValidate,
        validate: handleValidate,
        'dump.batches': handleDumpBatches,
        dump_group: handleDump,
        time_track: handleTimeTrack,
        brain: handleBrain,
        profiler: handleProfile,
        'tail-log:entries': nav.handleTailEntries,
        'tail-log:reset': nav.handleTailReset,
        'tail-log:meta': nav.handleTailMeta,
        'tail-log:error': nav.handleTailError,
        'tail-log:file-picked': nav.handleTailFilePicked
    };

    return {
        applicationPath,
        dispatch,
        handleDump,
        handleXdebug,
        DUMP_HANDLERS,
        // kept for direct wiring / testing
        handleLivewire,
        handleJobs,
        handleLogApplication,
        handleBrain,
        handleProfile
    };
}
