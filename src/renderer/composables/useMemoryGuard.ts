import { onMounted, onUnmounted } from 'vue';
import { useSettingsStore } from '@/store/settings';
import { usePayloadStore } from '@/store/payload';
import { useJobStore } from '@/store/jobs';
import { useLogStore } from '@/store/logs';
import { useTailLogStore } from '@/store/tail-log';
import { useQueriesPayloadStore } from '@/store/queries';
import { useMailStore } from '@/store/mail';
import { useLivewireStore } from '@/store/livewire';
import { useProfileStore } from '@/store/profile';
import { useTimeStore } from '@/store/time';

const SAMPLE_INTERVAL_MS = 10000;
const COOLDOWN_MS = 8000;
const DEFAULT_SOFT_MB = 300;
const DEFAULT_HARD_MB = 450;

type Level = 'soft' | 'hard';

const TARGETS: Record<Level, Record<string, number>> = {
    soft: {
        payload: 200,
        jobs: 100,
        logs: 100,
        tail: 500,
        queries: 100,
        mail: 100,
        livewire: 100,
        profile: 50,
        time: 200
    },
    hard: { payload: 100, jobs: 50, logs: 50, tail: 200, queries: 50, mail: 50, livewire: 50, profile: 20, time: 100 }
};

export function useMemoryGuard() {
    const settingsStore = useSettingsStore();
    const payloadStore = usePayloadStore();
    const jobStore = useJobStore();
    const logStore = useLogStore();
    const tailLogStore = useTailLogStore();
    const queriesStore = useQueriesPayloadStore();
    const mailStore = useMailStore();
    const livewireStore = useLivewireStore();
    const profileStore = useProfileStore();
    const timeStore = useTimeStore();

    let timer: ReturnType<typeof setInterval> | null = null;
    let cooldownUntil = 0;

    const usedMb = (): number => {
        const memory = (performance as any).memory;
        return memory ? memory.usedJSHeapSize / (1024 * 1024) : 0;
    };

    const recycle = (level: Level): void => {
        const target = TARGETS[level];
        const dropIncoming = level === 'hard';

        payloadStore.recycle(target.payload);
        jobStore.recycle(target.jobs, dropIncoming);
        logStore.recycle(target.logs, dropIncoming);
        tailLogStore.recycle(target.tail, dropIncoming);
        queriesStore.recycle(target.queries);
        mailStore.recycle(target.mail);
        livewireStore.recycle(target.livewire);
        profileStore.recycle(target.profile);
        timeStore.recycle(target.time);

        (window as any).gc?.();
    };

    const tick = (): void => {
        if (!settingsStore.settings.memory_guard_enabled) return;
        if (Date.now() < cooldownUntil) return;

        const mb = usedMb();
        if (!mb) return;

        const hardMb = Number(settingsStore.settings.memory_hard_mb) || DEFAULT_HARD_MB;
        const softMb = Number(settingsStore.settings.memory_soft_mb) || DEFAULT_SOFT_MB;

        if (mb >= hardMb) {
            recycle('hard');
            cooldownUntil = Date.now() + COOLDOWN_MS;
        } else if (mb >= softMb) {
            recycle('soft');
            cooldownUntil = Date.now() + COOLDOWN_MS;
        }
    };

    onMounted(() => {
        timer = setInterval(tick, SAMPLE_INTERVAL_MS);
    });

    onUnmounted(() => {
        if (timer) clearInterval(timer);
    });
}
