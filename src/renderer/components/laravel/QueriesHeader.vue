<script setup lang="ts">
import { useTimeStore } from "@/store/time";
import { computed } from "vue";
import { useFormattedQueriesStore } from "@/store/formatted-queries";
import { useQueryDuplicated } from "@/store/query-duplicated";
import { useQueriesOriginFilter } from "@/store/queries-origin-filter.js";
import { useQueriesChart } from "@/store/queries-chart.js";
import { SparklesIcon, ExclamationTriangleIcon, ChartBarIcon, LockClosedIcon, AdjustmentsHorizontalIcon } from "@heroicons/vue/24/outline";
import { useQueriesBlockedStore } from "@/store/queries-blocked";
import IconChevronDown from "@/components/Icons/IconChevronDown.vue";

const timeStore = useTimeStore();
const formattedQueriesStore = useFormattedQueriesStore();
const duplicatesStore = useQueryDuplicated();
const queriesOriginFilter = useQueriesOriginFilter();
const queriesChart = useQueriesChart();
const blockedQueriesStore = useQueriesBlockedStore();

const showBlockedQueries = () => {
    blocked_queries.showModal();
};

const options = ["http", "console"];

const toggle = (value) => {
    queriesOriginFilter.toggleFilter(value);
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
        <div
            v-if="timeStore.groups.length > 0"
            class="justify-between items-center gap-4 text-base-content"
        >
            <div class="flex justify-between uppercase py-1">
                <div class="flex w-full items-center">
                    <div>
                        <button
                            :class="{
                                '!text-secondary': timeStore.order === 'desc',
                                'text-primary': timeStore.order === 'asc'
                            }"
                            class="btn btn-sm px-2 bg-transparent border-0"
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

                    <div v-show="duplicatesStore.totalByRequestId(timeStore.selected) > 0">
                        <button
                            @click="toggleDuplicatedQueries"
                            :class="{
                                '!text-primary': duplicatesStore.showOnlyDuplicated
                            }"
                            class="btn btn-sm px-2 bg-transparent border-0"
                        >
                            <ExclamationTriangleIcon class="text-warning w-4" />
                        </button>
                    </div>
                </div>

                <!-- Actions -->
                <div class="flex items-center">
                    <button
                        @click="showBlockedQueries"
                        class="btn btn-sm px-2 bg-transparent border-0"
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
                            class="btn btn-sm px-2 bg-transparent border-0"
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
                            class="btn btn-sm px-2 bg-transparent border-0"
                            data-tippy-content="Order by and Filter Origin"
                        >
                            <AdjustmentsHorizontalIcon class="w-4.5" />
                        </div>
                        <ul
                            tabindex="0"
                            class="dropdown-content menu !text-sm bg-base-300 rounded-box z-1 w-52 p-2 shadow-sm"
                        >
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
                        class="btn btn-sm px-2 bg-transparent border-0"
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
    </div>
</template>
