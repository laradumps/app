<script setup lang="ts">
import { Payload } from '@/types/Payload';
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useQueriesPayloadStore } from '@/store/queries';
import { useTimeStore } from '@/store/time';
import DumpItem from '@/components/dumps/DumpItem.vue';
import { useQueryDuplicated } from '@/store/query-duplicated';
import { useQueriesBlockedStore } from '@/store/queries-blocked';
import {
    FunnelIcon,
    PlayIcon,
    AdjustmentsHorizontalIcon,
    TrashIcon,
    ArrowDownTrayIcon,
    CogIcon
} from '@heroicons/vue/24/outline';
import { BoltIcon, DocumentDuplicateIcon } from '@heroicons/vue/20/solid';
import tippy from 'tippy.js';
import { usePendingRequestsStore } from '@/store/pending-requests';
import RequestSwitcher from '@/components/common/RequestSwitcher.vue';
import ViewToolbar from '@/components/common/ViewToolbar.vue';
import IconButton from '@/components/common/IconButton.vue';
import PauseBanner from '@/components/common/PauseBanner.vue';
import FilterChip from '@/components/common/FilterChip.vue';
import IconPause from '@/components/Icons/IconPause.vue';
import { usePauseQueriesStore } from '@/store/pauses';
import EmptyState from '@/components/common/EmptyState.vue';
import { useGlobalSearchStore } from '@/store/global-search';
import { useQueriesChart } from '@/store/queries-chart';
import { defineAsyncComponent } from 'vue';
const QueriesChart = defineAsyncComponent(() => import('@/components/laravel/QueriesChart.vue'));
import DumpLink from '@/components/dumps/DumpLink.vue';
import DumpQueries from '@/components/laravel/DumpQueries.vue';
import { formatDuration } from '@/components/laravel/profile/profileHelpers';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);
import { useFormattedQueriesStore } from '@/store/formatted-queries';
import { exportQueriesToSQL } from '@/utils/queriesUtils';
import { groupByTime } from '@/utils/dumpGrouping';
import { useSettingsStore } from '@/store/settings';
import { useCurrentProject } from '@/store/current-project';

const queriesStore = useQueriesPayloadStore();
const timeStore = useTimeStore();
const blockedQueriesStore = useQueriesBlockedStore();
const queryDuplicatedStore = useQueryDuplicated();
const pendingRequestsStore = usePendingRequestsStore();
const pauseQueries = usePauseQueriesStore();
const globalSearchStore = useGlobalSearchStore();
const queriesChart = useQueriesChart();
const duplicatesStore = useQueryDuplicated();
const formattedQueriesStore = useFormattedQueriesStore();
const settingsStore = useSettingsStore();
const currentProjectStore = useCurrentProject();

const props = defineProps<{
    items?: [];
    inScreenWindow?: boolean;
    yamlConfig?: Record<string, any>;
    hideHeader?: boolean;
}>();

defineEmits(['open-screen-window']);

const selectedChartPoint = ref<Payload | null>(null);
const filteredClasses = ref<string[]>([]);
const filteredOrigins = ref<string[]>([]);
const collapsedGroups = ref<Record<string, boolean>>({});
const forceUpdate = ref(0);

const availableClasses = computed(() => {
    const items = props.items || queriesStore.payload;

    return [
        ...new Set(
            items
                .filter((payload: Payload) => payload.request_id === timeStore.selected)
                .map((payload: Payload) => payload.ide_handle?.class_name)
                .filter((c): c is string => !!c)
        )
    ];
});

const availableOrigins = computed(() => {
    const items = props.items || queriesStore.payload;

    return [
        ...new Set(
            items
                .filter((payload: Payload) => payload.request_id === timeStore.selected)
                .map((payload: Payload) => payload.queries?.origin)
                .filter((o): o is string => !!o)
        )
    ];
});

const queriesPerRequest = computed(() => {
    const counts = new Map<string, number>();
    for (const payload of queriesStore.payload as Payload[]) {
        counts.set(payload.request_id, (counts.get(payload.request_id) ?? 0) + 1);
    }
    return counts;
});

const requestItems = computed(() =>
    [...timeStore.groups].reverse().map((id: string) => ({
        id,
        method: timeStore.getMethod(id),
        label: timeStore.getUri(id) || 'Tinker',
        date: timeStore.getDate(id),
        count: queriesPerRequest.value.get(id) ?? 0,
        duration: timeStore.getTotal(id)
    }))
);

const selectRequest = (id: string | null | undefined) => {
    duplicatesStore.showOnlyDuplicated = false;
    timeStore.setSelectedRequest(id ?? null);
};

const sourceItems = computed<Payload[]>(() => props.items ?? queriesStore.payload);

watch(
    sourceItems,
    (items) => {
        duplicatesStore.rebuild(items);
    },
    { immediate: true }
);

watch(
    () => timeStore.selected,
    (requestId) => {
        duplicatesStore.setCurrentRequestId(requestId);
    },
    { immediate: true }
);

const queries = computed<Payload[]>(() => {
    forceUpdate.value;

    const items: Payload[] = sourceItems.value;
    const search = globalSearchStore.search.toLowerCase();
    const isSearchActive = search.length > 0;

    const result = items.filter((dump) => {
        const sql = dump.queries?.query?.sql || '';

        if (duplicatesStore.showOnlyDuplicated && !duplicatesStore.isDuplicated(dump.request_id, sql)) {
            return false;
        }

        if (isSearchActive) {
            const labelMatch = dump.with_label?.label?.toLowerCase().includes(search) ?? false;
            const queryMatch = (dump.queries?.query?.sql || '').toLowerCase().includes(search);
            if (!labelMatch && !queryMatch) {
                return false;
            }
        }

        if (filteredOrigins.value.length && !filteredOrigins.value.includes(dump.queries?.origin || '')) {
            return false;
        }

        return !(filteredClasses.value.length && !filteredClasses.value.includes(dump.ide_handle?.class_name || ''));
    });

    const sortFn =
        timeStore.order && timeStore.order !== 'default'
            ? (a: Payload, b: Payload) => {
                  const diff = (a.queries?.query?.time || 0) - (b.queries?.query?.time || 0);
                  return timeStore.order === 'asc' ? diff : -diff;
              }
            : undefined;

    return sortFn ? [...result].sort(sortFn) : result;
});

const clear = () => {
    if (pauseQueries.is_paused) {
        pauseQueries.toggle();
    }

    timeStore.clear();
    queriesStore.clear();
    blockedQueriesStore.clear();
    queryDuplicatedStore.clear();
    duplicatesStore.setCurrentRequestId(null);

    pendingRequestsStore.clear('queries');
};

onMounted(() => {
    nextTick(() => {
        tippy('[data-tippy-content]', {
            allowHTML: false,
            theme: 'light-border',
            placement: 'bottom'
        });
    });
});

const handlePointClick = (point) => {
    if (!point?.id) return;

    selectedChartPoint.value = queriesStore.payload.find((payload: Payload) => payload.id === point.id);
    chart_selected_query.showModal();
};

const groupedQueries = computed(() => {
    const isSearchActive = globalSearchStore.search.length > 0;
    const visible = isSearchActive
        ? queries.value
        : queries.value.filter((payload) => payload.request_id === timeStore.selected);

    return groupByTime(visible);
});

function toggleChartType(type: string) {
    if (queriesChart.type === type) {
        queriesChart.setType('none');
    } else {
        queriesChart.setType(type);
    }
}

const handleConfigChanged = (section: string, key: string, value: boolean) => {
    if (!props.yamlConfig || !currentProjectStore.projectInfo?.path) {
        console.warn('Cannot update YAML config: missing yamlConfig or project path');
        return;
    }

    const projectPath = currentProjectStore.projectInfo.path;

    window.ipcRenderer.send('storage.update-section', {
        path: projectPath,
        section: section,
        values: { [key]: value }
    });
};

const yamlObservers = computed(() => {
    const observers = props.yamlConfig?.observers;
    if (!observers) return [];

    const controls = [];

    if (observers.hasOwnProperty('queries')) {
        controls.push({
            key: 'queries',
            label: 'Enable Queries',
            enabled: observers.queries === true
        });
    }

    if (observers.hasOwnProperty('slow_queries')) {
        controls.push({
            key: 'slow_queries',
            label: 'Slow Queries',
            enabled: observers.slow_queries === true
        });
    }

    return controls;
});

const yamlQueryOptions = computed(() => {
    const queries = props.yamlConfig?.queries;
    if (!queries) return [];

    return Object.entries(queries)
        .filter(([_, value]) => typeof value === 'boolean')
        .map(([key, value]) => ({
            key: key,
            label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
            enabled: value === true
        }));
});

const toggleYamlControl = (section: string, key: string, currentValue: boolean) => {
    const newValue = !currentValue;
    handleConfigChanged(section, key, newValue);
};

const handleExportQueriesToSQL = async () => {
    await exportQueriesToSQL(sourceItems.value, timeStore.selected);
};

const setOrder = (order: string) => {
    timeStore.order = order;
};
</script>

<template>
    <div class="flex flex-col h-full min-h-0 min-w-0 overflow-hidden">
        <!-- Actions bar -->
        <ViewToolbar
            v-if="!hideHeader"
            class="shrink-0"
            :count="queries.length"
            noun="query"
        >
            <template #chips>
                <FilterChip
                    v-if="duplicatesStore.showOnlyDuplicated"
                    label="Duplicated"
                    @remove="duplicatesStore.toggleShowOnlyDuplicated()"
                />
                <FilterChip
                    v-for="o in filteredOrigins"
                    :key="'o-' + o"
                    :label="o"
                    @remove="filteredOrigins = filteredOrigins.filter((x) => x !== o)"
                />
                <FilterChip
                    v-for="c in filteredClasses"
                    :key="'c-' + c"
                    :label="c.split('\\').pop() || c"
                    @remove="filteredClasses = filteredClasses.filter((x) => x !== c)"
                />
            </template>

            <template #filter>
                <!-- Filter -->
                <div class="dropdown dropdown-bottom dropdown-start">
                    <IconButton
                        tabindex="0"
                        role="button"
                        label="Filter"
                        :active="
                            filteredClasses.length > 0 ||
                            filteredOrigins.length > 0 ||
                            duplicatesStore.showOnlyDuplicated
                        "
                        :disabled="!['none', 'percentage-colors'].includes(queriesChart.type)"
                        @click.stop
                    >
                        <FunnelIcon class="w-4" />
                    </IconButton>

                    <div
                        tabindex="0"
                        class="dropdown-content mt-2 z-[200] menu p-2 shadow-lg bg-base-200/95 backdrop-blur-xl rounded-xl border border-base-content/10 w-64"
                    >
                        <ul>
                            <li
                                v-show="duplicatesStore.hasDuplicatesInCurrentRequest"
                                @click="duplicatesStore.toggleShowOnlyDuplicated"
                                :class="{
                                    'bg-base-content/10 text-base-content font-medium':
                                        duplicatesStore.showOnlyDuplicated,
                                    'text-base-content/70 hover:bg-base-content/5 hover:text-base-content':
                                        !duplicatesStore.showOnlyDuplicated
                                }"
                            >
                                <a class="!text-xs">Duplicated</a>
                            </li>

                            <li>
                                <a
                                    href="#"
                                    class="!text-xs text-base-content/70 hover:bg-base-content/5 hover:text-base-content"
                                    >{{ $t('origin') }}</a
                                >
                                <ul tabindex="0">
                                    <li
                                        v-for="option in availableOrigins"
                                        :key="option"
                                    >
                                        <label class="!text-xs">
                                            <input
                                                type="checkbox"
                                                :value="option"
                                                :checked="filteredOrigins.includes(option)"
                                                @change="
                                                    () => {
                                                        if (filteredOrigins.includes(option)) {
                                                            filteredOrigins = filteredOrigins.filter(
                                                                (o) => o !== option
                                                            );
                                                        } else {
                                                            filteredOrigins.push(option);
                                                        }
                                                    }
                                                "
                                                class="checkbox checkbox-sm"
                                            />
                                            {{ option.charAt(0).toUpperCase() + option.slice(1) }}
                                        </label>
                                    </li>
                                </ul>
                            </li>

                            <li>
                                <a
                                    href="#"
                                    class="!text-xs text-base-content/70 hover:bg-base-content/5 hover:text-base-content"
                                    >Class</a
                                >
                                <ul tabindex="0">
                                    <li
                                        v-for="className in availableClasses"
                                        :key="className"
                                    >
                                        <label class="!text-xs">
                                            <input
                                                type="checkbox"
                                                :value="className"
                                                :checked="filteredClasses.includes(className)"
                                                @change="
                                                    () => {
                                                        if (filteredClasses.includes(className)) {
                                                            filteredClasses = filteredClasses.filter(
                                                                (c) => c !== className
                                                            );
                                                        } else {
                                                            filteredClasses.push(className);
                                                        }
                                                    }
                                                "
                                                class="checkbox checkbox-sm"
                                            />
                                            <span class="whitespace-nowrap">{{ className.split('\\').pop() }}</span>
                                        </label>
                                    </li>
                                </ul>
                            </li>
                        </ul>
                    </div>
                </div>
            </template>

            <template #right>
                <!-- YAML Configuration Dropdown -->
                <div class="dropdown dropdown-bottom dropdown-end">
                    <IconButton
                        tabindex="0"
                        role="button"
                        label="Settings"
                        variant="base"
                    >
                        <CogIcon class="w-4" />
                    </IconButton>
                    <div
                        tabindex="0"
                        class="p-2 shadow-xl dropdown-content menu bg-base-300 backdrop-blur-xl rounded-xl border-0 z-[100] w-auto min-w-35"
                    >
                        <div v-if="yamlQueryOptions.length > 0">
                            <div class="menu-title mb-2">
                                <span class="text-[9px] text-base-content/40 font-bold uppercase tracking-widest"
                                    >Query options</span
                                >
                            </div>
                            <div class="flex flex-col gap-1.5">
                                <button
                                    v-for="control in yamlQueryOptions"
                                    :key="control.key"
                                    @click="toggleYamlControl('queries', control.key, control.enabled)"
                                    class="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left"
                                    :class="
                                        control.enabled
                                            ? 'bg-base-content/10 text-base-content font-medium'
                                            : 'text-base-content/70 hover:bg-base-content/5 hover:text-base-content'
                                    "
                                >
                                    <div class="size-2.5 rounded-full relative flex items-center justify-center">
                                        <span
                                            v-if="control.enabled"
                                            class="absolute inline-flex h-full w-full rounded-full bg-success opacity-20"
                                        ></span>
                                        <span
                                            class="relative inline-flex rounded-full size-2 transition-all duration-200"
                                            :class="control.enabled ? 'bg-success' : 'bg-base-content/20'"
                                        ></span>
                                    </div>
                                    <span class="truncate capitalize text-xs whitespace-nowrap">{{
                                        control.label
                                    }}</span>
                                </button>
                            </div>
                        </div>

                        <div
                            v-if="yamlObservers.length === 0 && yamlQueryOptions.length === 0"
                            class="text-xs text-base-content/60 p-2"
                        >
                            No query configuration available
                        </div>
                    </div>
                </div>

                <!-- Actions Dropdown -->
                <div
                    v-if="queries.length > 0"
                    class="dropdown dropdown-bottom dropdown-end"
                >
                    <IconButton
                        tabindex="0"
                        role="button"
                        label="Actions"
                        variant="base"
                        @click.stop
                    >
                        <AdjustmentsHorizontalIcon class="size-4" />
                    </IconButton>

                    <ul
                        tabindex="0"
                        class="dropdown-content mt-2 z-[200] menu p-2 shadow-lg bg-base-200/95 backdrop-blur-xl rounded-xl border border-base-content/10 w-64"
                    >
                        <li
                            @click="formattedQueriesStore.toggle()"
                            :class="{
                                'bg-base-content/10 text-base-content font-medium': formattedQueriesStore.formatted,
                                'text-base-content/70 hover:bg-base-content/5 hover:text-base-content':
                                    !formattedQueriesStore.formatted
                            }"
                        >
                            <a class="!text-xs flex items-center gap-2"> Prettify </a>
                        </li>

                        <li class="menu-title my-1 uppercase !pl-1">
                            <span class="!text-xs text-base-content/60 font-light">Sort Order</span>
                        </li>

                        <li
                            @click="setOrder('default')"
                            :class="{
                                'bg-base-content/10 text-base-content font-medium':
                                    timeStore.order === 'default' || !timeStore.order,
                                'text-base-content/70 hover:bg-base-content/5 hover:text-base-content':
                                    timeStore.order !== 'default' && timeStore.order
                            }"
                        >
                            <a class="!text-xs">Default</a>
                        </li>
                        <li
                            @click="setOrder('asc')"
                            :class="{
                                'bg-base-content/10 text-base-content font-medium': timeStore.order === 'asc',
                                'text-base-content/70 hover:bg-base-content/5 hover:text-base-content':
                                    timeStore.order !== 'asc'
                            }"
                        >
                            <a class="!text-xs">Ascending</a>
                        </li>
                        <li
                            @click="setOrder('desc')"
                            :class="{
                                'bg-base-content/10 text-base-content font-medium': timeStore.order === 'desc',
                                'text-base-content/70 hover:bg-base-content/5 hover:text-base-content':
                                    timeStore.order !== 'desc'
                            }"
                        >
                            <a class="!text-xs">Descending</a>
                        </li>

                        <li class="menu-title my-1 uppercase !pl-1">
                            <span class="!text-xs text-base-content/60 font-light">Appearance</span>
                        </li>

                        <li
                            @click="toggleChartType('all')"
                            :class="{
                                'bg-base-content/10 text-base-content font-medium': queriesChart.type === 'all',
                                'text-base-content/70 hover:bg-base-content/5 hover:text-base-content':
                                    queriesChart.type !== 'all'
                            }"
                        >
                            <a class="!text-xs">Chart - All Requests</a>
                        </li>
                        <li
                            @click="toggleChartType('by-request')"
                            :class="{
                                'bg-base-content/10 text-base-content font-medium': queriesChart.type === 'by-request',
                                'text-base-content/70 hover:bg-base-content/5 hover:text-base-content':
                                    queriesChart.type !== 'by-request'
                            }"
                        >
                            <a class="!text-xs">Chart - By Request</a>
                        </li>
                        <li
                            @click="toggleChartType('percentage-colors')"
                            :class="{
                                'bg-base-content/10 text-base-content font-medium':
                                    queriesChart.type === 'percentage-colors',
                                'text-base-content/70 hover:bg-base-content/5 hover:text-base-content':
                                    queriesChart.type !== 'percentage-colors'
                            }"
                        >
                            <a class="!text-xs">Percentage Colors</a>
                        </li>

                        <li class="menu-title my-1 uppercase !pl-1">
                            <span class="!text-xs text-base-content/60 font-light">Tools</span>
                        </li>

                        <li @click="handleExportQueriesToSQL()">
                            <a
                                class="!text-xs flex items-center gap-2 text-base-content/70 hover:bg-base-content/5 hover:text-base-content"
                            >
                                <ArrowDownTrayIcon class="w-4" />
                                Export SQL
                            </a>
                        </li>
                    </ul>
                </div>

                <!-- Pause -->
                <IconButton
                    :label="pauseQueries.is_paused ? $t('resume') : $t('pause')"
                    variant="base"
                    @click="pauseQueries.toggle()"
                >
                    <PlayIcon
                        v-if="pauseQueries.is_paused"
                        class="w-4 text-warning"
                    />
                    <IconPause
                        v-else
                        class="w-4"
                    />
                </IconButton>

                <!-- Clear -->
                <IconButton
                    v-if="queries.length > 0"
                    label="Clear all"
                    variant="danger"
                    @click="clear()"
                >
                    <TrashIcon class="w-4" />
                </IconButton>
            </template>
        </ViewToolbar>

        <!-- Pause Banner -->
        <PauseBanner :paused="pauseQueries.is_paused" />

        <!-- Chart Modal -->
        <dialog
            id="chart_selected_query"
            class="modal"
        >
            <div
                v-if="selectedChartPoint"
                class="modal-box relative w-full max-w-2xl"
            >
                <div class="py-4 space-y-4 text-sm">
                    <DumpLink
                        v-if="selectedChartPoint.ide_handle"
                        :ide-handler="selectedChartPoint.ide_handle"
                    />
                    <div class="flex gap-2">
                        <div class="badge badge-ghost">{{ selectedChartPoint.queries?.query.time }}ms</div>
                        <div class="badge badge-ghost">{{ selectedChartPoint.queries?.origin }}</div>
                        <div class="badge badge-ghost">{{ selectedChartPoint.queries?.query.connectionName }}</div>
                        <div class="badge badge-ghost">{{ selectedChartPoint.queries?.database }}</div>
                    </div>

                    <!-- dump queries -->
                    <DumpQueries
                        v-if="selectedChartPoint"
                        class="w-full mr-"
                        :payload="selectedChartPoint"
                    />
                </div>
            </div>
            <form
                method="dialog"
                class="modal-backdrop"
            >
                <button>close</button>
            </form>
        </dialog>

        <div
            class="flex-1 min-h-0 flex flex-col"
            v-if="queriesStore.payload.length > 0 && timeStore.selected"
        >
            <RequestSwitcher
                :items="requestItems"
                :count-label="$t('switcher.queries_column')"
                :model-value="timeStore.selected"
                @update:model-value="selectRequest"
            >
                <template #flags="{ item }">
                    <span
                        v-if="queriesStore.hasExplainNodes(item.id)"
                        :title="$t('switcher.has_explain')"
                    >
                        <BoltIcon class="size-3.5 text-warning" />
                    </span>
                    <span
                        v-if="duplicatesStore.requestsWithDuplicates.has(item.id)"
                        :title="$t('switcher.has_duplicates')"
                    >
                        <DocumentDuplicateIcon class="size-3.5 text-error" />
                    </span>
                </template>

                <button
                    v-if="duplicatesStore.hasDuplicatesInCurrentRequest"
                    type="button"
                    :aria-pressed="duplicatesStore.showOnlyDuplicated"
                    :aria-label="$t('switcher.duplicated', { n: duplicatesStore.totalForCurrentRequest })"
                    :title="$t('switcher.duplicated', { n: duplicatesStore.totalForCurrentRequest })"
                    class="flex items-center gap-1 h-6 px-2 rounded-full text-[0.7rem] whitespace-nowrap cursor-pointer transition-colors"
                    :class="
                        duplicatesStore.showOnlyDuplicated
                            ? 'bg-error text-error-content'
                            : 'bg-error/15 text-error hover:bg-error/25'
                    "
                    @click="duplicatesStore.toggleShowOnlyDuplicated()"
                >
                    <DocumentDuplicateIcon class="size-3.5" />
                    <span class="@max-lg:hidden">{{
                        $t('switcher.duplicated', { n: duplicatesStore.totalForCurrentRequest })
                    }}</span>
                    <span class="@lg:hidden">{{ duplicatesStore.totalForCurrentRequest }}</span>
                </button>
                <span class="flex gap-1 font-mono text-xs text-base-content/60 tabular-nums whitespace-nowrap">
                    <span class="@max-xl:hidden">
                        {{ $t('switcher.queries', queriesPerRequest.get(timeStore.selected) ?? 0) }} ·
                    </span>
                    <span :class="timeStore.getTotal(timeStore.selected) >= 100 ? 'text-warning' : 'text-base-content'">
                        {{ formatDuration(timeStore.getTotal(timeStore.selected)) }}
                    </span>
                </span>
            </RequestSwitcher>

            <QueriesChart
                v-if="!['none', 'percentage-colors'].includes(queriesChart.type)"
                class="shrink-0"
                @point-click="handlePointClick"
            />

            <div
                v-else
                class="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 pb-3"
            >
                <div
                    v-for="(group, groupKey) in groupedQueries"
                    :key="groupKey"
                    class="w-full"
                >
                    <div
                        v-if="settingsStore.settings.grouped_by_time"
                        class="bg-base-200 flex items-center justify-between px-3 text-xs sticky top-0"
                    >
                        <span
                            :title="groupKey"
                            class="opacity-80"
                        >
                            {{ dayjs(groupKey).fromNow() }}
                        </span>
                    </div>

                    <div v-show="!collapsedGroups[groupKey]">
                        <div
                            v-for="payload in group"
                            :key="payload.id || payload.sf_dump_id"
                            :id="payload.id"
                            class="w-full"
                        >
                            <DumpItem
                                class="w-full group text-sm"
                                :payload="payload"
                                :is-prettified="formattedQueriesStore.formatted"
                                :show-time="!settingsStore.settings.grouped_by_time"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div
            v-else
            class="flex-1 min-h-0 flex items-center justify-center pointer-events-none"
        >
            <EmptyState />
        </div>
    </div>
</template>
