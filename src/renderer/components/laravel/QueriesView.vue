<script setup lang="ts">
import { Payload } from "@/types/Payload";
import { computed, defineProps, nextTick, onMounted, ref } from "vue";
import { useQueriesPayloadStore } from "@/store/queries";
import { useTimeStore } from "@/store/time";
import DumpItem from "@/components/dumps/DumpItem.vue";
import { useQueryDuplicated } from "@/store/query-duplicated";
import { useQueriesBlockedStore } from "@/store/queries-blocked";
import { TrashIcon, PlayIcon, FunnelIcon, ChartBarIcon, SparklesIcon, EyeIcon, EyeSlashIcon } from "@heroicons/vue/24/outline";
import tippy from "tippy.js";
import { usePendingRequestsStore } from "@/store/pending-requests";
import { Pane, Splitpanes } from "splitpanes";
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

const toggleGroupCollapse = (key: string) => {
    collapsedGroups.value[key] = !collapsedGroups.value[key];
};

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

const queries = computed(() => {
    const items = props.items ? props.items : queriesStore.payload;

    const reverseTimeOrder = (order: string) => {
        if (order === "default") {
            return undefined;
        }

        const isReversed = order !== "asc";
        return (a: Payload, b: Payload) => {
            const aTime = a?.queries?.query.time || 0;
            const bTime = b?.queries?.query.time || 0;
            return (aTime - bTime) * (isReversed ? -1 : 1);
        };
    };

    const sort = reverseTimeOrder(timeStore.order);
    const queryDuplicatedStore = useQueryDuplicated();

    items.forEach((dump: Payload) => {
        const sql = dump.queries?.query?.sql || "";

        const isDuplicate = items.filter((d: Payload) => d.request_id === dump.request_id && d.queries?.query?.sql === sql);

        queryDuplicatedStore.add(dump.request_id, sql, isDuplicate.length > 1, isDuplicate.length);
    });

    return items
        .filter((dump: Payload) => {
            if (queryDuplicatedStore.showOnlyDuplicated) {
                return queryDuplicatedStore.isDuplicated(dump.request_id, dump.queries?.query?.sql || "");
            }
            return true;
        })
        .filter(
            (payload: Payload) =>
                JSON.stringify(payload[payload.type] ?? "")
                    .toLowerCase()
                    .includes(globalSearchStore.search.toLowerCase()) || payload.label?.toLowerCase().includes(globalSearchStore.search.toLowerCase())
        )
        .filter((dump: Payload) => {
            const origin = dump.queries?.origin;
            if (!origin) return true;

            if (filteredOrigins.value.length === 0) return true;

            return filteredOrigins.value.includes(origin);
        })
        .filter((dump: Payload) => {
            const className = dump.ide_handle?.class_name;
            if (!className) return true;

            if (filteredClasses.value.length === 0) return true;

            return filteredClasses.value.includes(className);
        })
        .sort(sort);
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
</script>

<template>
    <div class="px-3">
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
                class="btn btn-sm p-[0.5rem]"
                @click="formattedQueriesStore.toggle()"
                v-if="queries.length > 0"
            >
                <SparklesIcon
                    :class="{
                        'w-4': true,
                        'w-4 text-secondary': formattedQueriesStore.formatted
                    }"
                />
            </button>

            <div class="dropdown dropdown-bottom dropdown-end">
                <!-- Filter -->
                <button
                    tabindex="0"
                    role="button"
                    class="btn btn-sm p-[0.5rem]"
                >
                    <FunnelIcon class="w-4" />
                </button>

                <ul
                    tabindex="0"
                    class="dropdown-content menu bg-base-300 rounded-box z-100 w-60 p-2 shadow-sm"
                >
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

                        <a class="!text-xs">Class</a>
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
                                    <span class="break-all">{{ className.split("\\").pop() }}</span>
                                </label>
                            </li>
                        </ul>
                    </li>
                </ul>
            </div>

            <!-- Chart Dropdown-->
            <div
                v-if="queries.length > 0"
                class="dropdown dropdown-end"
            >
                <div
                    tabindex="0"
                    role="button"
                    class="btn btn-sm p-[0.5rem]"
                    data-tippy-content="Chart Visibility"
                >
                    <ChartBarIcon
                        :class="{
                            'w-4': true,
                            'w-4 text-secondary': queriesChart.type !== 'none'
                        }"
                    />
                </div>
                <ul
                    tabindex="0"
                    class="dropdown-content gap-1 menu text-sm bg-base-300 rounded-box z-1 w-52 p-4 shadow-sm"
                >
                    <li>
                        <a
                            href="#"
                            class="!text-xs"
                            @click.prevent="queriesChart.setType('all')"
                            :class="{
                                'font-bold text-primary': queriesChart.type === 'all',
                                'text-base-content': queriesChart.type !== 'all'
                            }"
                        >
                            All Requests
                        </a>
                    </li>
                    <li>
                        <a
                            class="!text-xs"
                            href="#"
                            @click.prevent="queriesChart.setType('by-request')"
                            :class="{
                                'font-bold text-primary': queriesChart.type === 'by-request',
                                'text-base-content': queriesChart.type !== 'by-request'
                            }"
                        >
                            By Request
                        </a>
                    </li>
                    <li>
                        <a
                            class="!text-xs"
                            href="#"
                            @click.prevent="queriesChart.setType('none')"
                            :class="{
                                'font-bold text-primary': queriesChart.type === 'none',
                                'text-base-content': queriesChart.type !== 'none'
                            }"
                        >
                            Hide Chart
                        </a>
                    </li>
                </ul>
            </div>

            <!-- Sort Order -->
            <button
                v-if="queries.length > 0"
                :class="{
                    '!text-secondary': timeStore.order === 'desc',
                    'text-primary': timeStore.order === 'asc'
                }"
                class="btn btn-sm p-[0.5rem]"
                @click="timeStore.toggleOrder()"
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

            <!-- Pause -->
            <button
                @click="pauseQueries.toggle()"
                class="btn btn-sm p-[0.5rem]"
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
                class="btn btn-sm p-[0.5rem]"
                data-tippy-content="Clear"
            >
                <TrashIcon class="w-4" />
            </button>
        </Teleport>

        <div
            class="space-y-2"
            v-if="queriesStore.payload.length > 0"
        >
            <Splitpanes vertical>
                <pane
                    size="20"
                    class="text-sm mt-1"
                >
                    <div class="overflow-auto h-[calc(100vh-100px)]">
                        <QueriesRequests />
                    </div>
                </pane>

                <pane class="text-sm">
                    <div
                        v-if="timeStore.selected"
                        class="pl-2 space-y-1"
                    >
                        <div id="query-chart-result"></div>
                        <QueriesChart
                            v-if="queriesChart.type !== 'none'"
                            @point-click="handlePointClick"
                        />

                        <div class="overflow-auto h-[calc(100vh-144px)]">
                            <div
                                v-for="(group, groupKey) in groupedQueries"
                                :key="groupKey"
                                class="w-full"
                            >
                                <div
                                    class="bg-base-200 flex items-center justify-between py-1.5 px-2 z-300 text-xs sticky top-0 cursor-pointer"
                                    @click="toggleGroupCollapse(groupKey)"
                                >
                                    <span
                                        :title="groupKey"
                                        class="opacity-80"
                                    >
                                        {{ moment(groupKey).fromNow() }}
                                    </span>
                                    <span class="text-[10px] uppercase tracking-widest text-right">
                                        <EyeSlashIcon class="w-4" v-if="collapsedGroups[groupKey]" />
                                        <EyeIcon class="w-4" v-else />
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
                </pane>
            </Splitpanes>
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
