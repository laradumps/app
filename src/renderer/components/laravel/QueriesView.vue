<script setup lang="ts">
import { Payload } from "@/types/Payload";
import { computed, defineProps, nextTick, onMounted, ref } from "vue";
import { useQueriesPayloadStore } from "@/store/queries";
import { useTimeStore } from "@/store/time";
import DumpItem from "@/components/dumps/DumpItem.vue";
import { useQueryDuplicated } from "@/store/query-duplicated";
import { useQueriesBlockedStore } from "@/store/queries-blocked";
import { TrashIcon, ArrowsRightLeftIcon, PlayIcon, FunnelIcon, ChartBarIcon, SparklesIcon } from "@heroicons/vue/24/outline";
import tippy from "tippy.js";
import { usePendingRequestsStore } from "@/store/pending-requests";
import "splitpanes/dist/splitpanes.css";
import QueriesRequests from "@/components/laravel/QueriesRequests.vue";
import IconPause from "@/components/Icons/IconPause.vue";
import { usePauseQueriesStore } from "@/store/pause-queries";
import SvgEmpty from "@/components/svg/SvgEmpty.vue";
import { useGlobalSearchStore } from "@/store/global-search";
import { useQueriesChart } from "@/store/queries-chart";
import QueriesChart from "@/components/laravel/QueriesChart.vue";
import DumpLink from "@/components/dumps/DumpLink.vue";
import DumpQueries from "@/components/laravel/DumpQueries.vue";
import IconChevronDown from "@/components/Icons/IconChevronDown.vue";
import moment from "moment";
import { useFormattedQueriesStore } from "@/store/formatted-queries";

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

const queries = computed<Payload[]>(() => {
    const items: Payload[] = props.items ?? queriesStore.payload;
    const search = globalSearchStore.search.toLowerCase();
    const isSearchActive = search.length > 0;

    const result: Payload[] = [];
    const duplicatesMap = new Map<string, number>();

    for (const d of items) {
        const sql = d.queries?.query?.sql || "";
        const key = `${d.request_id}:${sql}`;
        duplicatesMap.set(key, (duplicatesMap.get(key) ?? 0) + 1);
    }

    for (const dump of items) {
        const sql = dump.queries?.query?.sql || "";
        const key = `${dump.request_id}:${sql}`;

        if (queryDuplicatedStore.showOnlyDuplicated && (duplicatesMap.get(key) ?? 0) <= 1) {
            continue;
        }

        if (isSearchActive) {
            const labelMatch = dump.with_label.label?.toLowerCase().includes(search) ?? false;
            const queryMatch = String(dump[dump.type] ?? "")
                .toLowerCase()
                .includes(search);
            if (!labelMatch && !queryMatch) {
                continue;
            }
        }

        if (filteredOrigins.value.length && !filteredOrigins.value.includes(dump.queries?.origin || "")) {
            continue;
        }

        if (filteredClasses.value.length && !filteredClasses.value.includes(dump.ide_handle?.class_name || "")) {
            continue;
        }

        result.push(dump);
    }

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

const orderLabel = computed(() => {
    if (!timeStore.order) return "Default order";
    return timeStore.order === "desc" ? "Order by desc" : "Order by asc";
});

const groupedQueries = computed(() => {
    return queries.value.reduce(
        (groups, payload) => {
            if (payload.request_id !== timeStore.selected) {
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

const convertMsToHumanReadable = (): string => {
    const ms = timeStore.getTotal(timeStore.selected);

    if (ms < 1000) return `${ms.toFixed(2)} ms`;

    const seconds = (ms / 1000).toFixed(2);

    return `${seconds} s`;
};
</script>

<template>
    <div class="px-3">
        <dialog
            id="request_dialog"
            ref="modalRef"
            class="modal modal-end rounded-none"
        >
            <div class="modal-box min-w-80 max-w-2xl p-3 py-0 rounded-none">
                <div class="py-4 space-y-4 text-sm">
                    <div class="font-semibold px-2">
                        <span class="text-lg">Requests</span>
                    </div>

                    <div>
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
            <!-- Prettify -->
            <button
                data-tippy-content="Prettify"
                class="btn border border-base-content/5 btn-sm p-[0.5rem] btn-circle"
                @click="formattedQueriesStore.toggle()"
                :disabled="!['none', 'percentage-colors'].includes(queriesChart.type)"
                v-if="queries.length > 0"
                :class="{
                    'border-primary text-primary': formattedQueriesStore.formatted
                }"
            >
                <SparklesIcon class="w-4" />
            </button>

            <div class="dropdown dropdown-bottom dropdown-end">
                <!-- Filter -->
                <button
                    tabindex="0"
                    role="button"
                    class="btn border border-base-content/5 btn-sm p-[0.5rem] btn-circle"
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
                            v-show="duplicatesStore.totalByRequestId(timeStore.selected) > 0"
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

            <!-- Sort Order -->
            <button
                v-if="queries.length > 0"
                :class="{
                    'border-primary text-primary': ['asc', 'desc'].includes(timeStore.order)
                }"
                class="btn border border-base-content/5 btn-sm p-[0.5rem] btn-circle"
                @click="timeStore.toggleOrder()"
                :disabled="!['none', 'percentage-colors'].includes(queriesChart.type)"
                :aria-label="orderLabel"
                :data-tippy-content="orderLabel"
            >
                <IconChevronDown
                    :class="[
                        '!w-4 transition-transform',
                        {
                            'rotate-0': timeStore.order === 'desc',
                            'rotate-180': timeStore.order === 'asc',
                            'opacity-50': timeStore.order === null || timeStore.order === undefined
                        }
                    ]"
                    stroke-width="2.2"
                />
            </button>

            <!-- Chart Dropdown-->
            <div
                v-if="queries.length > 0"
                class="dropdown dropdown-end"
            >
                <div
                    tabindex="0"
                    role="button"
                    class="btn border border-base-content/5 btn-sm p-[0.5rem] btn-circle"
                    data-tippy-content="Chart Visibility"
                    :class="{
                        'border-primary text-primary': ['all', 'by-request', 'percentage-colors'].includes(queriesChart.type)
                    }"
                >
                    <ChartBarIcon class="w-4" />
                </div>

                <ul
                    tabindex="0"
                    class="dropdown-content gap-1 menu text-sm bg-base-300 rounded-box z-1 w-52 p-4 shadow-sm"
                >
                    <li>
                        <a
                            href="#"
                            class="!text-xs"
                            @click.prevent="toggleChartType('all')"
                            :class="{
                                'font-bold text-primary': queriesChart.type === 'all',
                                'text-base-content': queriesChart.type !== 'all'
                            }"
                        >
                            Chart - All Requests
                        </a>
                    </li>
                    <li>
                        <a
                            href="#"
                            class="!text-xs"
                            @click.prevent="toggleChartType('by-request')"
                            :class="{
                                'font-bold text-primary': queriesChart.type === 'by-request',
                                'text-base-content': queriesChart.type !== 'by-request'
                            }"
                        >
                            Chart - By Request
                        </a>
                    </li>
                    <li>
                        <a
                            href="#"
                            class="!text-xs"
                            @click.prevent="toggleChartType('percentage-colors')"
                            :class="{
                                'font-bold text-primary': queriesChart.type === 'percentage-colors',
                                'text-base-content': queriesChart.type !== 'percentage-colors'
                            }"
                        >
                            Percentage Colors
                        </a>
                    </li>
                </ul>
            </div>

            <!-- Pause -->
            <button
                @click="pauseQueries.toggle()"
                class="btn border border-base-content/5 btn-sm p-[0.5rem] btn-circle"
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
                class="btn border border-base-content/5 btn-sm p-[0.5rem] btn-circle"
                data-tippy-content="Clear"
            >
                <TrashIcon class="w-4" />
            </button>
        </Teleport>

        <div
            class="space-y-2"
            v-if="queriesStore.payload.length > 0 && timeStore.selected"
        >
            <div class="flex justify-between">
                <button
                    class="btn btn-sm hover:text-primary text-sm font-normal link"
                    @click="openRequestsModal()"
                >
                    <ArrowsRightLeftIcon class="w-4 inline-block" />
                    {{ timeStore.get(timeStore.selected).uri }}
                </button>
                <span class="text-base font-sans text-primary font-normal">{{ convertMsToHumanReadable() }}</span>
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
                        <div class="bg-base-200 flex items-center justify-between py-1.5 px-2 text-xs sticky top-0">
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
                                    v-show="payload.request_id === timeStore.selected"
                                    :payload="payload"
                                    :show-time="false"
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
<style scoped>
@reference "./../../styles.css";

::v-deep(.splitpanes__splitter) {
    @apply opacity-0 hover:opacity-100 min-w-[0.2rem] bg-neutral/10 rounded-box hover:bg-secondary/60;
}
</style>
