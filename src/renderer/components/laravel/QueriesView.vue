<script setup lang="ts">
import { Payload } from "@/types/Payload";
import { computed, defineProps, nextTick, onMounted, ref, watch } from "vue";
import { useQueriesPayloadStore } from "@/store/queries";
import { useTimeStore } from "@/store/time";
import DumpItem from "@/components/dumps/DumpItem.vue";
import { useQueryDuplicated } from "@/store/query-duplicated";
import { useQueriesBlockedStore } from "@/store/queries-blocked";
import { ArrowsRightLeftIcon, FunnelIcon, PlayIcon, AdjustmentsHorizontalIcon, TrashIcon, ArrowDownTrayIcon } from "@heroicons/vue/24/outline";
import tippy from "tippy.js";
import { usePendingRequestsStore } from "@/store/pending-requests";
import QueriesRequests from "@/components/laravel/QueriesRequests.vue";
import IconPause from "@/components/Icons/IconPause.vue";
import { usePauseQueriesStore } from "@/store/pause-queries";
import SvgEmpty from "@/components/svg/SvgEmpty.vue";
import { useGlobalSearchStore } from "@/store/global-search";
import { useQueriesChart } from "@/store/queries-chart";
import QueriesChart from "@/components/laravel/QueriesChart.vue";
import DumpLink from "@/components/dumps/DumpLink.vue";
import DumpQueries from "@/components/laravel/DumpQueries.vue";
import moment from "moment";
import { useFormattedQueriesStore } from "@/store/formatted-queries";
import { convertMsToHumanReadable, exportQueriesToSQL } from "@/utils/queriesUtils";
import { useSettingsStore } from "@/store/settings";

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

const props = defineProps<{
    items: [];
    inScreenWindow: boolean;
}>();

const selectedChartPoint = ref<Payload | null>(null);
const filteredClasses = ref<string[]>([]);
const filteredOrigins = ref<string[]>([]);
const collapsedGroups = ref<Record<string, boolean>>({});

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
    const items: Payload[] = sourceItems.value;
    const search = globalSearchStore.search.toLowerCase();
    const isSearchActive = search.length > 0;

    const result = items.filter((dump) => {
        const sql = dump.queries?.query?.sql || "";

        if (duplicatesStore.showOnlyDuplicated && !duplicatesStore.isDuplicated(dump.request_id, sql)) {
            return false;
        }

        if (isSearchActive) {
            const labelMatch = dump.with_label.label?.toLowerCase().includes(search) ?? false;
            const queryMatch = (dump.queries?.query?.sql || "").toLowerCase().includes(search);
            if (!labelMatch && !queryMatch) {
                return false;
            }
        }

        if (filteredOrigins.value.length && !filteredOrigins.value.includes(dump.queries?.origin || "")) {
            return false;
        }

        return !(filteredClasses.value.length && !filteredClasses.value.includes(dump.ide_handle?.class_name || ""));
    });

    const sortFn =
        timeStore.order && timeStore.order !== "default"
            ? (a: Payload, b: Payload) => {
                  const diff = (a.queries?.query?.time || 0) - (b.queries?.query?.time || 0);
                  return timeStore.order === "asc" ? diff : -diff;
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

    pendingRequestsStore.clear("queries");
};

onMounted(() => {
    nextTick(() => {
        tippy("[data-tippy-content]", {
            allowHTML: true,
            theme: "light-border",
            placement: "bottom"
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
            const groupKey = moment(payload.date_time).format("YYYY-MM-DD HH:mm:ss");
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
        queriesChart.setType("none");
    } else {
        queriesChart.setType(type);
    }
}

const openRequestsModal = () => {
    request_dialog.showModal();
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
    <div class="px-3">
        <dialog
            id="request_dialog"
            ref="modalRef"
            class="modal"
        >
            <div class="modal-box min-w-80 max-w-2xl p-4 py-0">
                <div class="py-4 space-y-4 text-sm overflow-auto">
                    <div class="font-semibold px-2">
                        <span class="text-lg">Requests</span>
                    </div>

                    <div class="max-h-[calc(100vh-22rem)] overflow-auto">
                        <QueriesRequests />
                    </div>
                </div>
            </div>
            <form
                method="dialog"
                class="modal-backdrop"
            >
                <button>close</button>
            </form>
        </dialog>

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

        <Teleport to="#actions">
            <!-- Actions Dropdown -->
            <div
                v-if="queries.length > 0"
                class="dropdown dropdown-bottom dropdown-end"
            >
                <button
                    tabindex="0"
                    role="button"
                    class="btn border border-base-content/5 btn-sm p-[0.5rem] btn-circle btn-soft"
                    data-tippy-content="Actions"
                    :class="{
                        'border-primary text-primary':
                            formattedQueriesStore.formatted || ['asc', 'desc'].includes(timeStore.order) || ['all', 'by-request', 'percentage-colors'].includes(queriesChart.type)
                    }"
                >
                    <AdjustmentsHorizontalIcon class="size-4" />
                </button>

                <ul
                    tabindex="0"
                    class="dropdown-content menu bg-base-300 rounded-box z-100 w-52 p-2 shadow-sm"
                >
                    <li
                        @click="formattedQueriesStore.toggle()"
                        :class="{
                            '!text-primary': formattedQueriesStore.formatted
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
                            '!text-primary': timeStore.order === 'default' || !timeStore.order
                        }"
                    >
                        <a class="!text-xs">Default</a>
                    </li>
                    <li
                        @click="setOrder('asc')"
                        :class="{
                            '!text-primary': timeStore.order === 'asc'
                        }"
                    >
                        <a class="!text-xs">Ascending</a>
                    </li>
                    <li
                        @click="setOrder('desc')"
                        :class="{
                            '!text-primary': timeStore.order === 'desc'
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
                            '!text-primary': queriesChart.type === 'all'
                        }"
                    >
                        <a class="!text-xs">Chart - All Requests</a>
                    </li>
                    <li
                        @click="toggleChartType('by-request')"
                        :class="{
                            '!text-primary': queriesChart.type === 'by-request'
                        }"
                    >
                        <a class="!text-xs">Chart - By Request</a>
                    </li>
                    <li
                        @click="toggleChartType('percentage-colors')"
                        :class="{
                            '!text-primary': queriesChart.type === 'percentage-colors'
                        }"
                    >
                        <a class="!text-xs">Percentage Colors</a>
                    </li>

                    <li class="menu-title my-1 uppercase !pl-1">
                        <span class="!text-xs text-base-content/60 font-light">Tools</span>
                    </li>

                    <li @click="handleExportQueriesToSQL()">
                        <a class="!text-xs flex items-center gap-2">
                            <ArrowDownTrayIcon class="w-4" />
                            Export SQL
                        </a>
                    </li>
                </ul>
            </div>

            <div class="dropdown dropdown-bottom dropdown-end">
                <!-- Filter -->
                <button
                    tabindex="0"
                    role="button"
                    class="btn border border-base-content/5 btn-sm p-[0.5rem] btn-circle btn-soft"
                    :disabled="!['none', 'percentage-colors'].includes(queriesChart.type)"
                    :class="{
                        'border-primary text-primary': filteredClasses.length > 0 || filteredOrigins.length > 0 || duplicatesStore.showOnlyDuplicated
                    }"
                >
                    <FunnelIcon class="w-4" />
                </button>

                <div
                    tabindex="0"
                    class="dropdown-content menu bg-base-300 rounded-box z-100 w-auto min-w-60 p-2 shadow-sm"
                >
                    <ul>
                        <li
                            v-show="duplicatesStore.hasDuplicatesInCurrentRequest"
                            @click="duplicatesStore.toggleShowOnlyDuplicated"
                            :class="{
                                '!text-primary': duplicatesStore.showOnlyDuplicated
                            }"
                        >
                            <a class="!text-xs">Duplicated</a>
                        </li>

                        <li>
                            <a
                                href="#"
                                class="!text-xs"
                                >Origin</a
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
                                                        filteredOrigins = filteredOrigins.filter((o) => o !== option);
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

                            <span class="!text-xs">Class</span>
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
                                                        filteredClasses = filteredClasses.filter((c) => c !== className);
                                                    } else {
                                                        filteredClasses.push(className);
                                                    }
                                                }
                                            "
                                            class="checkbox checkbox-sm"
                                        />
                                        <span class="whitespace-nowrap">{{ className.split("\\").pop() }}</span>
                                    </label>
                                </li>
                            </ul>
                        </li>
                    </ul>
                </div>
            </div>

            <!-- Pause -->
            <button
                @click="pauseQueries.toggle()"
                class="btn border border-base-content/5 btn-sm p-[0.5rem] btn-circle btn-soft"
                :class="{
                    'border-primary text-primary': pauseQueries.is_paused
                }"
                :data-tippy-content="$t('pause')"
            >
                <PlayIcon
                    v-if="pauseQueries.is_paused"
                    class="w-4"
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
                class="btn border border-base-content/5 btn-sm p-[0.5rem] btn-circle btn-soft"
                data-tippy-content="Clear"
            >
                <TrashIcon class="w-4" />
            </button>
        </Teleport>

        <div
            class="space-y-2"
            v-if="queriesStore.payload.length > 0 && timeStore.selected"
        >
            <div class="flex justify-between items-center gap-3">
                <button
                    class="btn btn-soft bg-base-100 btn-sm text-xs font-normal p-2 pr-3 rounded-full"
                    @click="openRequestsModal()"
                >
                    <ArrowsRightLeftIcon class="w-4 inline-block" />
                    <span class="opacity-80"> ({{ timeStore.getRequestCount() }}) </span>
                    {{ timeStore.getSelectedRequest().uri ? timeStore.getSelectedRequest().uri : "Tinker" }}
                </button>
                <div class="flex items-center gap-2">
                    <div class="badge badge-ghost badge-sm font-mono">{{ getQueriesCount(timeStore.selected) }} {{ getQueriesCount(timeStore.selected) === 1 ? "query" : "queries" }}</div>
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
                    class="overflow-auto h-[calc(100vh-144px)]"
                    v-else
                >
                    <div
                        v-for="(group, groupKey) in groupedQueries"
                        :key="groupKey"
                        class="w-full"
                    >
                        <div
                            v-if="settingsStore.settings.grouped_by_time"
                            class="bg-base-200 flex items-center justify-between py-1.5 px-2 text-xs sticky top-0"
                        >
                            <span
                                :title="groupKey"
                                class="opacity-80"
                            >
                                {{ moment(groupKey).fromNow() }}
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
                                    class="w-full group text-sm mb-3"
                                    :payload="payload"
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
            class="-mt-[90px] -ml-8 absolute flex items-center justify-center w-full"
            style="height: -webkit-fill-available"
        >
            <SvgEmpty class="w-30 opacity-25" />
            <div class="text-base-content/70">
                <h1 class="text-lg font-semibold mb-2">Empty</h1>
            </div>
        </div>
    </div>
</template>
