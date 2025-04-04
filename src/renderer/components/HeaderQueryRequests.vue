<script setup lang="ts">
import { useTimeStore } from "@/store/time";
import SelectMenu from "@/components/SelectMenu.vue";
import { computed, ref, watch } from "vue";
import { useFormattedQueriesStore } from "@/store/formatted-queries";
import { useQueryDuplicated } from "@/store/query-duplicated";
import { useQueriesOriginFilter } from "@/store/queries-origin-filter.js";
import QueriesChart from "@/components/laravel/QueriesChart.vue";
import { useQueriesPayloadStore } from "@/store/queries.js";
import { useQueriesChart } from "@/store/queries-chart.js";
import { Payload } from "@/types/Payload";
import { SparklesIcon, ChartBarIcon, LockClosedIcon, AdjustmentsHorizontalIcon } from "@heroicons/vue/20/solid";
import { useQueriesBlockedStore } from "@/store/queries-blocked";
import DumpQueries from "@/components/laravel/DumpQueries.vue";
import DumpLink from "@/components/DumpLink.vue";

const timeStore = useTimeStore();
const queriesStore = useQueriesPayloadStore();
const formattedQueriesStore = useFormattedQueriesStore();
const duplicatesStore = useQueryDuplicated();
const queriesOriginFilter = useQueriesOriginFilter();
const queriesChart = useQueriesChart();
const blockedQueriesStore = useQueriesBlockedStore();

interface CharPoint {
    time: string;
    value: number;
    id: string;
}

const getDataPoints = ref<CharPoint>();
const selectedChartPoint = ref<Payload|null>(null)

const props = defineProps({
    total: {
        type: Number,
        default: 0
    },
    totalFiltered: {
        type: Number,
        default: 0
    },
    inScreenWindow: {
        type: Boolean,
        default: false
    }
});

const showBlockedQueries = () => {
    blocked_queries.showModal();
};

const options = ["http", "console"];

const toggle = (value) => {
    queriesOriginFilter.toggleFilter(value);
};

const allRequests = computed(() => {
    let requests = timeStore.groups.map((group, index) => ({
        index: index + 1,
        id: group,
        label: `#${index + 1} - <b>${timeStore.getTotal(group).toFixed(2)}ms</b> - ${timeStore.getUri(group)} (${timeStore.getMethod(group)})`
    }));

    if (queriesOriginFilter.origin.length > 0) {
        requests = requests.filter((request) => queriesOriginFilter.origin.includes(timeStore.getOrigin(request.id)));
    }

    requests.sort((a, b) => b.index - a.index);

    return requests;
});

watch(
    () => timeStore.selected,
    (value) => {
        if (value === null) {
            getDataPoints.value = null;
            return;
        }

        if (queriesChart.type === "by-request") {
            setTimeout(() => {
                getDataPoints.value = queriesStore.payload
                    .filter((payload: Payload) => payload.request_id === value)
                    .map((payload: Payload) => ({
                        time: payload.date_time,
                        value: payload.queries.time,
                        id: payload.id
                    }));
            }, 200);
        }

        if (queriesChart.type === "all") {
            setTimeout(() => {
                getDataPoints.value = queriesStore.payload.map((payload: Payload) => ({
                    time: payload.date_time,
                    value: payload.queries?.time,
                    id: payload.id
                }));
            }, 200);
        }
    },
    { immediate: true }
);

watch(
    () => queriesChart,
    (value) => {
        if (value.type === "by-request") {
            setTimeout(() => {
                getDataPoints.value = queriesStore.payload
                    .filter((payload: Payload) => payload.request_id === timeStore.selected)
                    .map((payload: Payload) => ({
                        time: payload.date_time,
                        value: payload.queries.time,
                        id: payload.id
                    }));
            }, 200);
        }

        if (value.type === "all") {
            setTimeout(() => {
                getDataPoints.value = queriesStore.payload.map((payload: Payload) => ({
                    time: payload.date_time,
                    value: payload.queries.time,
                    id: payload.id
                }));
            }, 200);
        }
    },
    { deep: true, immediate: true }
);

const handlePointClick = (index) => {
    const selectedPoint = getDataPoints.value[index]
    if (selectedPoint && selectedPoint.id) {
        selectedChartPoint.value = queriesStore.payload
            .filter((payload: Payload) => payload.id === selectedPoint.id
            )[0];

        chart_selected_query.showModal()
    }
};
</script>

<template>
    <div class="gap-3 flex flex-col z-100 h-auto w-full">
        <dialog id="chart_selected_query" class="modal">
            <div v-if="selectedChartPoint" class="modal-box relative w-full max-w-2xl">
                <p class="py-4 space-y-4 text-sm">
                    <DumpLink v-if="selectedChartPoint.ide_handle" :ide-handler="selectedChartPoint.ide_handle" />
                    <div class="flex gap-2">
                        <div class="badge badge-soft badge-ghost">{{ selectedChartPoint.queries?.time }}ms</div>
                        <div class="badge badge-soft badge-ghost">{{ selectedChartPoint.queries?.origin }}</div>
                        <div class="badge badge-soft badge-ghost">{{ selectedChartPoint.queries?.connectionName }}</div>
                        <div class="badge badge-soft badge-ghost">{{ selectedChartPoint.queries?.database }}</div>
                    </div>

                    <!-- dump queries -->
                    <DumpQueries
                        v-if="selectedChartPoint"
                        class="w-full mr-"
                        :payload="selectedChartPoint"
                    />
                </p>
            </div>
            <form method="dialog" class="modal-backdrop">
                <button>close</button>
            </form>
        </dialog>

        <div
            v-if="timeStore.groups.length > 0"
            class="justify-between items-center gap-4 text-base-content"
        >
            <div class="flex justify-between my-1 uppercase">
                <div class="flex w-full items-center">
                    <div class="flex flex-row-reverse gap-3 items-center">
                        <span class="text-primary text-base whitespace-nowrap">{{ timeStore.get(timeStore.selected)?.total.toFixed(2) }} ms</span>
                        <span class="text-xs">time</span>
                    </div>

                    <div class="divider divider-horizontal !mx-1.5"></div>

                    <div class="flex flex-row-reverse gap-3 items-center">
                        <span class="text-primary text-base whitespace-nowrap">{{ totalFiltered }}</span>
                        <span class="text-xs">queries</span>
                    </div>

                    <div
                        v-show="duplicatesStore.totalByRequestId(timeStore.selected) > 0"
                        class="divider divider-horizontal !mx-1.5"
                    ></div>

                    <div
                        v-show="duplicatesStore.totalByRequestId(timeStore.selected) > 0"
                        class="flex flex-row-reverse gap-3 items-center"
                    >
                        <span class="text-primary text-base">{{ duplicatesStore.totalByRequestId(timeStore.selected) }}</span>
                        <span class="badge lowercase badge-xs badge-warning text-warning-content text-xs">duplicated</span>
                    </div>
                </div>

                <div class="flex gap-2 items-center">
                    <button
                        @click="showBlockedQueries"
                        class="btn btn-soft btn-sm"
                        data-tippy-content="Blocked Queries"
                    >
                        <LockClosedIcon class="text-warning size-4 hover:opacity-75" />
                        <span
                            class="text-xs font-normal opacity-70"
                            v-if="blockedQueriesStore.blocked.length > 0"
                        >
                            ({{ blockedQueriesStore.blocked.length }})
                        </span>
                    </button>

                    <div class="dropdown dropdown-end">
                        <div
                            tabindex="0"
                            role="button"
                            class="btn btn-soft btn-sm"
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

                    <div class="dropdown dropdown-end">
                        <div
                            tabindex="0"
                            role="button"
                            class="btn btn-soft btn-sm"
                            data-tippy-content="Order by and Filter Origin"
                        >
                            <AdjustmentsHorizontalIcon class="w-4.5" />
                        </div>
                        <ul
                            tabindex="0"
                            class="dropdown-content menu !text-sm bg-base-300 rounded-box z-1 w-52 p-4 shadow-sm"
                        >
                            <li class="text-xs uppercase font-normal mb-1">Order by:</li>
                            <li>
                                <label class="!text-xs">
                                    <input
                                        v-model="timeStore.order"
                                        type="radio"
                                        name="radio-order"
                                        class="radio radio-sm !text-sm"
                                        value="default"
                                        @change="timeStore.setOrder('default')"
                                    />
                                    default
                                </label>
                            </li>
                            <li>
                                <label class="!text-xs">
                                    <input
                                        v-model="timeStore.order"
                                        type="radio"
                                        name="radio-order"
                                        class="radio radio-sm"
                                        value="desc"
                                        @change="timeStore.setOrder('desc')"
                                    />
                                    desc
                                </label>
                            </li>
                            <li>
                                <label class="!text-xs">
                                    <input
                                        v-model="timeStore.order"
                                        type="radio"
                                        name="radio-order"
                                        class="radio radio-sm"
                                        value="asc"
                                        @change="timeStore.setOrder('asc')"
                                    />
                                    asc
                                </label>
                            </li>
                            <li class="text-xs uppercase font-normal my-3">origin:</li>
                            <li
                                v-for="option in options"
                                :key="option"
                            >
                                <label class="!text-xs">
                                    <input
                                        type="checkbox"
                                        :value="option"
                                        :checked="queriesOriginFilter.origin.includes(option)"
                                        @change="toggle(option)"
                                        class="checkbox checkbox-sm"
                                    />
                                    {{ option.charAt(0).toUpperCase() + option.slice(1) }}
                                </label>
                            </li>
                        </ul>
                    </div>

                    <button
                        data-tippy-content="Prettify"
                        class="btn btn-sm btn-soft"
                        @click="formattedQueriesStore.toggle()"
                    >
                        <SparklesIcon
                            :class="{
                                'w-4': true,
                                'w-4 text-secondary': formattedQueriesStore.formatted
                            }"
                        />
                    </button>
                </div>
            </div>
        </div>

        <div class="flex w-full text-sm items-center justify-between">
            <div class="w-full">
                <SelectMenu
                    v-if="allRequests.length > 0"
                    @selected="timeStore.setSelectedRequest($event.id)"
                    class="w-auto !text-xs"
                    v-model:data="allRequests"
                />
            </div>
        </div>

        <QueriesChart
            class="mt-2"
            v-if="queriesChart.type !== 'none' && getDataPoints"
            :data-points="getDataPoints"
            @pointClick="handlePointClick"
        />
    </div>
</template>
