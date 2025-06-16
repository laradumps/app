<script setup lang="ts">
import { useTimeStore } from "@/store/time";
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
import DumpLink from "@/components/dumps/DumpLink.vue";
import IconWarning from "@/components/Icons/IconWarning.vue";
import IconChevronDown from "@/components/Icons/IconChevronDown.vue";

const timeStore = useTimeStore();
const queriesStore = useQueriesPayloadStore();
const formattedQueriesStore = useFormattedQueriesStore();
const duplicatesStore = useQueryDuplicated();
const queriesOriginFilter = useQueriesOriginFilter();
const queriesChart = useQueriesChart();
const blockedQueriesStore = useQueriesBlockedStore();

interface CharPoint {
    time: Date;
    value: number;
    id: string;
}

const getDataPoints = ref<CharPoint | null>();
const selectedChartPoint = ref<Payload | null>(null);

const showBlockedQueries = () => {
    blocked_queries.showModal();
};

const options = ["http", "console"];

const toggle = (value) => {
    queriesOriginFilter.toggleFilter(value);
};

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
                    .map(
                        (payload: Payload): CharPoint => ({
                            time: payload.date_time,
                            value: payload.queries?.query.time,
                            id: payload.id
                        })
                    );
            }, 200);
        }

        if (queriesChart.type === "all") {
            setTimeout(() => {
                getDataPoints.value = queriesStore.payload.map(
                    (payload: Payload): CharPoint => ({
                        time: payload.date_time,
                        value: payload.queries?.query.time,
                        id: payload.id
                    })
                );
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
                        value: payload.queries.query.time,
                        id: payload.id
                    }));
            }, 200);
        }

        if (value.type === "all") {
            setTimeout(() => {
                getDataPoints.value = queriesStore.payload.map((payload: Payload) => ({
                    time: payload.date_time,
                    value: payload.queries.query.time,
                    id: payload.id
                }));
            }, 200);
        }
    },
    { deep: true, immediate: true }
);

const handlePointClick = (index) => {
    const selectedPoint = getDataPoints.value[index];
    if (selectedPoint && selectedPoint.id) {
        selectedChartPoint.value = queriesStore.payload.filter((payload: Payload) => payload.id === selectedPoint.id)[0];

        chart_selected_query.showModal();
    }
};

const toggleDuplicatedQueries = () => {
    duplicatesStore.toggleShowOnlyDuplicated();
};

const orderLabel = computed(() => {
    if (!timeStore.order) return "Default order";
    return timeStore.order === "desc" ? "Order by desc" : "Order by asc";
});
</script>

<template>
    <div class="flex flex-col z-100 h-auto w-full">
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
                        <div class="badge badge-soft badge-ghost">{{ selectedChartPoint.queries?.query.time }}ms</div>
                        <div class="badge badge-soft badge-ghost">{{ selectedChartPoint.queries?.origin }}</div>
                        <div class="badge badge-soft badge-ghost">{{ selectedChartPoint.queries?.query.connectionName }}</div>
                        <div class="badge badge-soft badge-ghost">{{ selectedChartPoint.queries?.database }}</div>
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
            v-if="timeStore.groups.length > 0"
            class="justify-between items-center gap-4 text-base-content"
        >
            <div class="flex justify-between uppercase py-1">
                <div class="flex gap-2 w-full items-center">
                    <div class="flex gap-1">
                        <button
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
                    </div>

                    <div
                        v-show="duplicatesStore.totalByRequestId(timeStore.selected) > 0"
                        class="flex gap-3 items-center"
                    >
                        <button
                            @click="toggleDuplicatedQueries"
                            :class="{
                                '!bg-base-300': duplicatesStore.showOnlyDuplicated
                            }"
                            class="btn hover:bg-base-100 text-xs !py-3 lowercase cursor-pointer badge badge-sm badge-soft"
                        >
                            <IconWarning class="text-warning w-4" />
                            <span class="opacity-70">{{ duplicatesStore.totalByRequestId(timeStore.selected) }} duplicated</span>
                        </button>
                    </div>
                </div>

                <div class="flex gap-1 items-center">
                    <button
                        @click="showBlockedQueries"
                        class="btn btn-sm p-[0.5rem]"
                        data-tippy-content="Blocked Queries"
                    >
                        <LockClosedIcon
                            :class="{
                                'text-warning ': blockedQueriesStore.blocked.length > 0
                            }"
                            class="size-4 hover:opacity-75"
                        />
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
                            class="btn btn-sm p-[0.5rem]"
                            data-tippy-content="Order by and Filter Origin"
                        >
                            <AdjustmentsHorizontalIcon class="w-4.5" />
                        </div>
                        <ul
                            tabindex="0"
                            class="dropdown-content menu !text-sm bg-base-300 rounded-box z-1 w-52 p-4 shadow-sm"
                        >
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
                        class="btn btn-sm p-[0.5rem]"
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

        <QueriesChart
            v-if="queriesChart.type !== 'none'"
            :data-points="getDataPoints"
            @pointClick="handlePointClick"
        />
    </div>
</template>
