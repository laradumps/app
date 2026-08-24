import { useTimeStore } from '@/store/time';
import { useColorStore } from '@/store/colors';
import { useGlobalSearchStore } from '@/store/global-search';
import { usePayloadStore } from '@/store/payload';
import { useQueriesPayloadStore } from '@/store/queries';
import { useMailStore } from '@/store/mail';
import { useJobStore } from '@/store/jobs';
import { useLogStore } from '@/store/logs';
import { usePendingRequestsStore } from '@/store/pending-requests';
import { useQueryDuplicated } from '@/store/query-duplicated';
import { useScreenStore } from '@/store/screen';
import { useLivewireStore } from '@/store/livewire';
import { useBrainStore } from '@/store/brains';
import { useProfileStore } from '@/store/profile';
import { useTailLogStore } from '@/store/tail-log';
import { useMcpStore } from '@/store/mcp';
import { useSettingsStore } from '@/store/settings';
import { useCurrentProject } from '@/store/current-project';
import {
    usePausePayloadStore,
    usePauseQueriesStore,
    usePauseLogsStore,
    usePauseJobsStore,
    usePauseProfileStore
} from '@/store/pauses';

export function useClearAll() {
    const timeStore = useTimeStore();
    const colorStore = useColorStore();
    const globalSearchStore = useGlobalSearchStore();
    const payloadStore = usePayloadStore();
    const logStore = useLogStore();
    const jobStore = useJobStore();
    const queryStore = useQueriesPayloadStore();
    const mailStore = useMailStore();
    const pendingRequestsStore = usePendingRequestsStore();
    const duplicatesStore = useQueryDuplicated();
    const screenStore = useScreenStore();
    const livewireStore = useLivewireStore();
    const brainStore = useBrainStore();
    const profileStore = useProfileStore();
    const tailLogStore = useTailLogStore();
    const mcpStore = useMcpStore();
    const settingsStore = useSettingsStore();
    const currentProjectStore = useCurrentProject();
    const pausePayloadStore = usePausePayloadStore();
    const pauseQueriesStore = usePauseQueriesStore();
    const pauseLogsStore = usePauseLogsStore();
    const pauseJobsStore = usePauseJobsStore();
    const pauseProfileStore = usePauseProfileStore();

    const clear = (): void => {
        // store
        payloadStore.clearAll();
        timeStore.clear();
        globalSearchStore.clear();
        colorStore.clear();
        logStore.clear();
        jobStore.clear();
        mailStore.clear();
        queryStore.clear();
        duplicatesStore.clear();
        livewireStore.clear();
        brainStore.clear();
        profileStore.clear();
        tailLogStore.clearAll();
        mcpStore.clearLogs();
        pendingRequestsStore.clear('queries');

        // pause
        pausePayloadStore.setPause(false);
        pauseQueriesStore.setPause(false);
        pauseLogsStore.setPause(false);
        pauseJobsStore.setPause(false);
        pauseProfileStore.setPause(false);

        screenStore.add({
            screen_name: 'home',
            raise_in: 0,
            visible: true,
            pinned: false,
            new_window: false
        });

        if (settingsStore.settings.tail_log_enabled) {
            screenStore.add({
                screen_name: 'tail_logs',
                raise_in: 0,
                visible: true,
                pinned: false,
                new_window: false
            });

            window.ipcRenderer.send('tail-log:start', {
                projectPath: currentProjectStore.projectInfo?.path
            });
        }

        window.ipcRenderer.send('storage.get');

        window.ipcRenderer.send('badge-icon.increment', {
            reset: true
        });
    };

    return {
        clear
    };
}
