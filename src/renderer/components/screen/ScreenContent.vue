<script lang="ts" setup>
import CacheGateView from '@/components/laravel/CacheGateView.vue';
import JobView from '@/components/laravel/JobView.vue';
import MailView from '@/components/laravel/MailView.vue';
import LogView from '@/components/laravel/LogView.vue';
import TailLogView from '@/components/laravel/TailLogView.vue';
import QueriesView from '@/components/laravel/QueriesView.vue';
import BrainView from '@/components/laravel/BrainView.vue';
import ProfileView from '@/components/laravel/ProfileView.vue';
import DumpList from '@/components/dumps/DumpList.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import { Payload } from '@/types/Payload';
import { usePayloadStore } from '@/store/payload';
import { KNOWN_SCREENS } from '@/constants';
import { computed } from 'vue';

const props = withDefaults(
    defineProps<{
        screenName: string;
        mode?: 'normal' | 'screen-window' | 'split-pane';
        yamlConfig?: Record<string, any>;
        hideHeader?: boolean;
        extraClass?: string;
        openScreenWindow?: (screen?: string) => void;
        dumpsBagFiltered?: Payload[];
        groupedDumps?: Record<string, Payload[]>;
        emptyScreenExclude?: string[];
        screenWindowItems?: any[];
        showWelcome?: boolean;
    }>(),
    {
        showWelcome: true
    }
);

const payloadStore = usePayloadStore();

const isScreenWindow = computed(() => props.mode === 'screen-window');
const isSplit = computed(() => props.mode === 'split-pane');

const VIEW_MAP: Record<string, any> = {
    cache: CacheGateView,
    gate: CacheGateView,
    jobs: JobView,
    brain: BrainView,
    profiler: ProfileView,
    mail: MailView,
    logs: LogView,
    tail_logs: TailLogView,
    queries: QueriesView
};

const activeView = computed(() => VIEW_MAP[props.screenName] ?? null);

// Each known view takes a different slice of props; build only what it declares
// so nothing leaks onto the root element as a stray attribute.
const viewProps = computed<Record<string, any>>(() => {
    const fillClass = ['jobs', 'logs', 'tail_logs', 'profiler', 'brain', 'mail', 'queries'].includes(props.screenName)
        ? 'h-full min-h-0 flex-1'
        : '';
    const base = {
        class: [props.extraClass, fillClass].filter(Boolean).join(' '),
        hideHeader: props.hideHeader
    };

    switch (props.screenName) {
        case 'cache':
        case 'gate':
            return {
                ...base,
                screen: props.screenName,
                inScreenWindow: isScreenWindow.value,
                items: props.screenWindowItems
            };
        case 'jobs':
        case 'brain':
        case 'mail':
            return {
                ...base,
                inScreenWindow: isScreenWindow.value,
                items: props.screenWindowItems,
                isSplit: isSplit.value
            };
        case 'logs':
            return {
                ...base,
                yamlConfig: props.yamlConfig,
                inScreenWindow: isScreenWindow.value,
                items: props.screenWindowItems
            };
        case 'profiler':
        case 'queries':
            return { ...base, yamlConfig: props.yamlConfig };
        default:
            return base;
    }
});

const isGenericDumpScreen = computed(
    () => !KNOWN_SCREENS.includes(props.screenName as any) && Boolean(props.dumpsBagFiltered && props.groupedDumps)
);
</script>

<template>
    <component
        :is="activeView"
        v-if="activeView"
        v-bind="viewProps"
        @open-screen-window="openScreenWindow"
    />

    <KeepAlive>
        <DumpList
            v-if="isGenericDumpScreen"
            :key="screenName"
            :screen-name="screenName"
            :dumps-bag-filtered="dumpsBagFiltered"
            :grouped-dumps="groupedDumps"
            :empty-screen-exclude="emptyScreenExclude"
            :show-welcome="showWelcome"
        />
    </KeepAlive>

    <div
        v-if="!activeView && !isGenericDumpScreen"
        class="px-3"
    >
        <div
            v-if="payloadStore.get(screenName).length === 0"
            class="flex items-center justify-center h-full py-20"
        >
            <EmptyState />
        </div>
    </div>
</template>
