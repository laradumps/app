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
    EllipsisHorizontalIcon,
    TrashIcon,
    ArrowDownTrayIcon,
    CodeBracketIcon
} from '@heroicons/vue/24/outline';
import {
    Bars3BottomLeftIcon,
    BoltIcon,
    CheckIcon,
    DocumentDuplicateIcon,
    ListBulletIcon,
    PresentationChartLineIcon,
    Squares2X2Icon
} from '@heroicons/vue/20/solid';
import tippy from 'tippy.js';
import { usePendingRequestsStore } from '@/store/pending-requests';
import RequestSwitcher from '@/components/common/RequestSwitcher.vue';
import MenuRow from '@/components/navbar/MenuRow.vue';
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

const viewModes = [
    { type: 'none', icon: ListBulletIcon, key: 'list' },
    { type: 'percentage-colors', icon: Bars3BottomLeftIcon, key: 'waterfall' },
    { type: 'by-request', icon: PresentationChartLineIcon, key: 'chart' },
    { type: 'all', icon: Squares2X2Icon, key: 'chart_all' }
];

const sortOrders = [
    { order: 'default', key: 'arrival' },
    { order: 'desc', key: 'slowest' },
    { order: 'asc', key: 'fastest' }
];

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

const toggleFilter = (list: string[], value: string) => {
    const index = list.indexOf(value);
    if (index === -1) list.push(value);
    else list.splice(index, 1);
};
</script>

<template>
    <div class="flex flex-col h-full min-h-0 min-w-0 overflow-hidden">
        <!-- Actions bar -->
        <ViewToolbar
            v-if="!hideHeader"
            class="shrink-0"
        >
            <template #chips>
                <FilterChip
                    v-for="o in filteredOrigins"
                    :key="'o-' + o"
                    :label="o"
                    @remove="toggleFilter(filteredOrigins, o)"
                />
                <FilterChip
                    v-for="c in filteredClasses"
                    :key="'c-' + c"
                    :label="c.split('\\').pop() || c"
                    @remove="toggleFilter(filteredClasses, c)"
                />
            </template>

            <template #filter>
                <div class="dropdown dropdown-bottom dropdown-start">
                    <IconButton
                        tabindex="0"
                        role="button"
                        :label="$t('queries_view.filter')"
                        :active="filteredClasses.length > 0 || filteredOrigins.length > 0"
                        :disabled="!['none', 'percentage-colors'].includes(queriesChart.type)"
                        @click.stop
                    >
                        <FunnelIcon class="w-4" />
                    </IconButton>

                    <div
                        tabindex="0"
                        role="menu"
                        :aria-label="$t('queries_view.filter')"
                        class="dropdown-content mt-2 z-[200] w-56 p-1 rounded-lg border border-base-content/10 bg-base-100 shadow-xl"
                    >
                        <template v-if="availableOrigins.length">
                            <p class="px-2 pt-1 pb-0.5 text-[0.7rem] text-base-content/45">{{ $t('origin') }}</p>
                            <MenuRow
                                v-for="option in availableOrigins"
                                :key="'o-' + option"
                                role="menuitemcheckbox"
                                :aria-checked="filteredOrigins.includes(option)"
                                :label="option.charAt(0).toUpperCase() + option.slice(1)"
                                @click="toggleFilter(filteredOrigins, option)"
                            >
                                <CheckIcon
                                    class="size-4 text-primary"
                                    :class="{ invisible: !filteredOrigins.includes(option) }"
                                />
                            </MenuRow>
                        </template>

                        <div
                            v-if="availableOrigins.length && availableClasses.length"
                            class="my-1 h-px bg-base-content/10"
                        ></div>

                        <template v-if="availableClasses.length">
                            <p class="px-2 pt-1 pb-0.5 text-[0.7rem] text-base-content/45">
                                {{ $t('queries_view.class') }}
                            </p>
                            <MenuRow
                                v-for="className in availableClasses"
                                :key="'c-' + className"
                                role="menuitemcheckbox"
                                :aria-checked="filteredClasses.includes(className)"
                                :label="className.split('\\').pop() || className"
                                :title="className"
                                @click="toggleFilter(filteredClasses, className)"
                            >
                                <CheckIcon
                                    class="size-4 text-primary"
                                    :class="{ invisible: !filteredClasses.includes(className) }"
                                />
                            </MenuRow>
                        </template>

                        <p
                            v-if="!availableOrigins.length && !availableClasses.length"
                            class="px-2 py-2 text-xs text-base-content/45"
                        >
                            {{ $t('queries_view.no_filters') }}
                        </p>
                    </div>
                </div>
            </template>

            <template #right>
                <!-- Actions Dropdown -->
                <div class="dropdown dropdown-bottom dropdown-end">
                    <IconButton
                        tabindex="0"
                        role="button"
                        :label="$t('queries_view.actions')"
                        variant="base"
                        @click.stop
                    >
                        <EllipsisHorizontalIcon class="size-4" />
                    </IconButton>

                    <div
                        tabindex="0"
                        role="menu"
                        :aria-label="$t('queries_view.actions')"
                        class="dropdown-content mt-2 z-[200] w-56 p-1 rounded-lg border border-base-content/10 bg-base-100 shadow-xl"
                    >
                        <p class="px-2 pt-1 pb-0.5 text-[0.7rem] text-base-content/45">{{ $t('queries_view.sort') }}</p>
                        <MenuRow
                            v-for="sort in sortOrders"
                            :key="sort.order"
                            role="menuitemradio"
                            :aria-checked="(timeStore.order || 'default') === sort.order"
                            :label="$t(`queries_view.${sort.key}`)"
                            @click="setOrder(sort.order)"
                        >
                            <CheckIcon
                                class="size-4 text-primary"
                                :class="{ invisible: (timeStore.order || 'default') !== sort.order }"
                            />
                        </MenuRow>

                        <div class="my-1 h-px bg-base-content/10"></div>

                        <MenuRow
                            toggle
                            :label="$t('queries_view.prettify')"
                            :model-value="formattedQueriesStore.formatted"
                            @update:model-value="formattedQueriesStore.toggle()"
                        >
                            <CodeBracketIcon class="size-4" />
                        </MenuRow>
                        <MenuRow
                            v-if="queries.length > 0"
                            :label="$t('queries_view.export')"
                            value=".sql"
                            @click="handleExportQueriesToSQL()"
                        >
                            <ArrowDownTrayIcon class="size-4" />
                        </MenuRow>

                        <template v-if="yamlQueryOptions.length">
                            <div class="my-1 h-px bg-base-content/10"></div>
                            <p class="px-2 pt-1 pb-0.5 text-[0.7rem] text-base-content/45">
                                {{ $t('queries_view.project_config') }}
                            </p>
                            <MenuRow
                                v-for="control in yamlQueryOptions"
                                :key="control.key"
                                toggle
                                :label="control.label"
                                :model-value="control.enabled"
                                @update:model-value="toggleYamlControl('queries', control.key, control.enabled)"
                            />
                        </template>
                    </div>
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
                <div
                    role="radiogroup"
                    :aria-label="$t('queries_view.mode')"
                    class="flex p-0.5 rounded-md bg-base-content/5"
                >
                    <button
                        v-for="mode in viewModes"
                        :key="mode.type"
                        type="button"
                        role="radio"
                        :aria-checked="queriesChart.type === mode.type"
                        :aria-label="$t(`queries_view.${mode.key}`)"
                        :title="$t(`queries_view.${mode.key}_title`)"
                        class="inline-flex items-center gap-1 h-6 px-2 rounded text-xs cursor-pointer transition-colors"
                        :class="
                            queriesChart.type === mode.type
                                ? 'bg-base-content/15 text-base-content'
                                : 'text-base-content/50 hover:text-base-content'
                        "
                        @click="queriesChart.setType(mode.type)"
                    >
                        <component
                            :is="mode.icon"
                            class="w-3"
                        />
                        <span class="@max-3xl:hidden">{{ $t(`queries_view.${mode.key}`) }}</span>
                    </button>
                </div>
                <span
                    class="@max-md:hidden flex gap-1 font-mono text-xs text-base-content/60 tabular-nums whitespace-nowrap"
                >
                    <span class="@max-2xl:hidden">
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
                class="flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
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
