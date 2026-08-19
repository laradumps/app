<script setup lang="ts">
import { Payload } from '@/types/Payload';
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useQueriesPayloadStore } from '@/store/queries';
import { useTimeStore } from '@/store/time';
import DumpItem from '@/components/dumps/DumpItem.vue';
import { useQueryDuplicated } from '@/store/query-duplicated';
import { useQueriesBlockedStore } from '@/store/queries-blocked';
import {
    ArrowsRightLeftIcon,
    FunnelIcon,
    PlayIcon,
    AdjustmentsHorizontalIcon,
    TrashIcon,
    ArrowDownTrayIcon,
    CogIcon,
    MagnifyingGlassIcon
} from '@heroicons/vue/24/outline';
import tippy from 'tippy.js';
import { usePendingRequestsStore } from '@/store/pending-requests';
import QueriesRequests from '@/components/laravel/QueriesRequests.vue';
import ViewToolbar from '@/components/common/ViewToolbar.vue';
import FilterChip from '@/components/common/FilterChip.vue';
import IconPause from '@/components/Icons/IconPause.vue';
import { usePauseQueriesStore } from '@/store/pauses';
import SvgEmpty from '@/components/svg/SvgEmpty.vue';
import { useGlobalSearchStore } from '@/store/global-search';
import { useQueriesChart } from '@/store/queries-chart';
import QueriesChart from '@/components/laravel/QueriesChart.vue';
import DumpLink from '@/components/dumps/DumpLink.vue';
import DumpQueries from '@/components/laravel/DumpQueries.vue';
import BaseDrawer from '@/components/common/BaseDrawer.vue';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);
import { useFormattedQueriesStore } from '@/store/formatted-queries';
import { convertMsToHumanReadable, exportQueriesToSQL } from '@/utils/queriesUtils';
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

const isRequestsDrawerOpen = ref(false);

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

const filteredRequestsCount = computed(() => {
    let requests = timeStore.groups.map((requestId: string) => ({
        label: timeStore.getUri(requestId),
        method: timeStore.getMethod(requestId),
        count: queriesStore.payload.filter((payload: Payload) => payload.request_id == requestId).length,
        time: timeStore.getTotal(requestId)
    }));

    if (timeStore.search?.trim()) {
        const searchLower = timeStore.search.toLowerCase();
        requests = requests.filter(
            (req) =>
                req.label?.toLowerCase().includes(searchLower) ||
                req.method?.toLowerCase().includes(searchLower) ||
                String(req.count).includes(searchLower) ||
                req.time.toString().includes(searchLower)
        );
    }

    return requests.length;
});

const sourceItems = computed<Payload[]>(() => props.items ?? queriesStore.payload);

watch(
    sourceItems,
    (items) => {
        duplicatesStore.rebuild(items);
    },
    { immediate: true, deep: true }
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
            const labelMatch = dump.with_label.label?.toLowerCase().includes(search) ?? false;
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
            allowHTML: true,
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
    return queries.value.reduce(
        (groups, payload) => {
            if (!isSearchActive && payload.request_id !== timeStore.selected) {
                return groups;
            }
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

function toggleChartType(type: string) {
    if (queriesChart.type === type) {
        queriesChart.setType('none');
    } else {
        queriesChart.setType(type);
    }
}

const openRequestsModal = () => {
    isRequestsDrawerOpen.value = true;
};

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

const getQueriesCount = (requestId: string): number => {
    return queriesStore.payload.filter((payload: Payload) => payload.request_id === requestId).length;
};

const handleExportQueriesToSQL = async () => {
    await exportQueriesToSQL(sourceItems.value, timeStore.selected);
};

const getHumanReadableTime = (): string => {
    const ms = timeStore.getTotal(timeStore.selected);
    return convertMsToHumanReadable(ms);
};

const setOrder = (order: string) => {
    timeStore.order = order;
};
</script>

<template>
    <div>
        <!-- Actions bar -->
        <ViewToolbar
            v-if="!hideHeader"
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
                    <button
                        tabindex="0"
                        role="button"
                        class="btn btn-ghost btn-circle btn-sm"
                        :disabled="!['none', 'percentage-colors'].includes(queriesChart.type)"
                        @click.stop
                        :class="{
                            'text-primary':
                                filteredClasses.length > 0 ||
                                filteredOrigins.length > 0 ||
                                duplicatesStore.showOnlyDuplicated
                        }"
                        data-tippy-content="Filters"
                    >
                        <FunnelIcon class="w-4" />
                    </button>

                    <div
                        tabindex="0"
                        class="dropdown-content mt-2 z-[200] menu p-2 shadow-[0_10px_40px_rgba(0,0,0,0.5)] bg-base-200/95 backdrop-blur-xl rounded-xl border border-white/5 w-64"
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
                    <button
                        tabindex="0"
                        role="button"
                        class="btn btn-ghost btn-circle btn-xs"
                        :class="{
                            'text-primary':
                                yamlObservers.some((control) => control.enabled) ||
                                yamlQueryOptions.some((control) => control.enabled)
                        }"
                        data-tippy-content="YAML Configuration"
                    >
                        <CogIcon class="w-4" />
                    </button>
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
                                            :class="
                                                control.enabled
                                                    ? 'bg-success shadow-[0_0_6px_rgba(34,197,94,0.8)]'
                                                    : 'bg-base-content/20'
                                            "
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
                    <button
                        tabindex="0"
                        role="button"
                        class="btn btn-ghost btn-circle btn-sm"
                        data-tippy-content="Actions"
                        @click.stop
                        :class="{
                            'text-primary':
                                formattedQueriesStore.formatted ||
                                ['asc', 'desc'].includes(timeStore.order) ||
                                ['all', 'by-request', 'percentage-colors'].includes(queriesChart.type)
                        }"
                    >
                        <AdjustmentsHorizontalIcon class="size-4" />
                    </button>

                    <ul
                        tabindex="0"
                        class="dropdown-content mt-2 z-[200] menu p-2 shadow-[0_10px_40px_rgba(0,0,0,0.5)] bg-base-200/95 backdrop-blur-xl rounded-xl border border-white/5 w-64"
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
                <button
                    @click="pauseQueries.toggle()"
                    class="btn btn-ghost btn-circle btn-sm"
                    :class="{
                        'text-primary': pauseQueries.is_paused
                    }"
                    :data-tippy-content="$t('pause')"
                >
                    <PlayIcon
                        v-if="pauseQueries.is_paused"
                        class="w-4 text-warning"
                    />
                    <IconPause
                        v-else
                        class="w-4"
                    />
                </button>

                <!-- Clear -->
                <button
                    v-if="queries.length > 0"
                    @click="clear()"
                    class="btn btn-ghost btn-circle btn-sm text-error/70 hover:text-error"
                    data-tippy-content="Clear"
                >
                    <TrashIcon class="w-4" />
                </button>
            </template>
        </ViewToolbar>
 
        <!-- Pause Banner -->
        <div
            v-if="pauseQueries.is_paused"
            class="bg-warning/10 text-warning text-[10px] px-3 py-1.5 flex items-center gap-2 border-b border-warning/20 shrink-0"
        >
            <PlayIcon class="w-3 h-3" />
            <span>{{ $t('app.inactive_banner') }}</span>
        </div>
 
        <div>
            <BaseDrawer
                id="queries-requests-drawer"
                v-model="isRequestsDrawerOpen"
                title="Requests"
                width="600px"
            >
                <div class="flex flex-col h-full">
                    <!-- Search bar -->
                    <div class="flex items-center gap-2 px-4 py-3 border-b border-base-content/10">
                        <label class="input input-sm input-bordered flex items-center gap-2 h-8 grow rounded-lg">
                            <MagnifyingGlassIcon class="w-3.5 opacity-50" />
                            <input
                                v-model="timeStore.search"
                                type="text"
                                class="grow text-xs"
                                :placeholder="$t('profiler.filter')"
                            />
                        </label>
                        <span class="badge badge-ghost badge-sm font-mono">{{ filteredRequestsCount }}</span>
                    </div>

                    <div class="flex-1 overflow-auto">
                        <QueriesRequests />
                    </div>
                </div>
            </BaseDrawer>

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
                class="space-y-2 mt-2"
                v-if="queriesStore.payload.length > 0 && timeStore.selected"
            >
                <div class="flex justify-between items-center gap-3 px-3">
                    <button
                        class="max-w-1/2 btn btn-soft bg-base-100 btn-sm text-xs font-normal p-2 pr-3 rounded-full"
                        @click="openRequestsModal()"
                    >
                        <ArrowsRightLeftIcon class="w-4 shrink-0" />
                        <span class="opacity-80 shrink-0"> ({{ timeStore.getRequestCount() }}) </span>
                        <span class="truncate min-w-0">{{
                            timeStore.getSelectedRequest().uri ? timeStore.getSelectedRequest().uri : 'Tinker'
                        }}</span>
                    </button>
                    <div class="flex items-center gap-2">
                        <div class="badge badge-ghost badge-sm font-mono">
                            {{ getQueriesCount(timeStore.selected) }}
                            {{ getQueriesCount(timeStore.selected) === 1 ? 'query' : 'queries' }}
                        </div>
                        <div class="badge badge-primary badge-sm font-mono">
                            {{ getHumanReadableTime() }}
                        </div>
                    </div>
                </div>

                <div class="space-y-1">
                    <div id="query-chart-result"></div>

                    <QueriesChart
                        v-if="!['none', 'percentage-colors'].includes(queriesChart.type)"
                        @point-click="handlePointClick"
                    />

                    <div
                        class="overflow-auto h-[calc(100vh-184px)] px-3"
                        v-else
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
                                    :key="payload.sf_dump_id"
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
            </div>

            <div
                v-else
                class="-mt-[90px] -ml-8 absolute flex items-center justify-center w-full pointer-events-none"
                style="height: -webkit-fill-available"
            >
                <SvgEmpty class="w-30 opacity-25" />
                <div class="text-base-content/70">
                    <h1 class="text-lg font-semibold mb-2">{{ $t('empty') }}</h1>
                </div>
            </div>
        </div>
    </div>
</template>
