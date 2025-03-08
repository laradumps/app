<script setup>
import { useTimeStore } from "@/store/time";
import SelectMenu from "@/components/SelectMenu.vue";
import { computed, ref, watch } from "vue";
import { useFormattedQueriesStore } from "@/store/formatted-queries";
import { useQueryDuplicated } from "@/store/query-duplicated";
import { useQueriesOriginFilter } from "@/store/queries-origin-filter.js";
import { AdjustmentsHorizontalIcon } from "@heroicons/vue/20/solid";

const timeStore = useTimeStore();
const formattedQueriesStore = useFormattedQueriesStore();
const duplicatesStore = useQueryDuplicated();
const queriesOriginFilter = useQueriesOriginFilter();

const orderBy = ref("default");

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

watch(orderBy, (value) => {
    timeStore.setOrder(value);
});

const options = ["http", "console"];

const toggle = (value) => {
    queriesOriginFilter.toggleFilter(value);
};
</script>

<template>
    <div class="gap-2 flex flex-col bg-base-100 z-100 h-auto w-full">
        <div
            v-if="timeStore.groups.length > 0"
            class="justify-between items-center gap-4 text-base-content"
        >
            <div class="flex justify-between mt-0.5">
                <div class="flex w-full items-center">
                    <div class="flex flex-row-reverse gap-3 items-center">
                        <span class="text-primary text-base whitespace-nowrap">{{ timeStore.get(timeStore.selected)?.total.toFixed(2) }} ms</span>
                        <span class="text-xs uppercase">time</span>
                    </div>

                    <div class="divider divider-horizontal !mx-1.5"></div>

                    <div class="flex flex-row-reverse gap-3 items-center">
                        <span class="text-primary text-base whitespace-nowrap">{{ totalFiltered }}</span>
                        <span class="text-xs uppercase">queries</span>
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

                <div class="flex gap-3 items-end">
                    <div>
                        <div class="dropdown dropdown-end">
                            <div
                                tabindex="0"
                                role="button"
                                class="btn btn-sm btn-circle btn-soft btn-accent"
                            >
                                <AdjustmentsHorizontalIcon class="w-4" />
                            </div>
                            <ul
                                tabindex="0"
                                class="dropdown-content menu !text-sm bg-base-300 rounded-box z-1 w-52 p-4 shadow-sm"
                            >
                                <li class="text-xs uppercase font-normal mb-1">Order by:</li>
                                <li>
                                    <label>
                                        <input
                                            v-model="orderBy"
                                            type="radio"
                                            name="radio-order"
                                            class="radio radio-sm radio-accent"
                                            value="default"
                                        />
                                        default
                                    </label>
                                </li>
                                <li>
                                    <label>
                                        <input
                                            v-model="orderBy"
                                            type="radio"
                                            name="radio-order"
                                            class="radio radio-sm radio-accent"
                                            value="desc"
                                        />
                                        desc
                                    </label>
                                </li>
                                <li>
                                    <label>
                                        <input
                                            v-model="orderBy"
                                            type="radio"
                                            name="radio-order"
                                            class="radio radio-sm radio-accent"
                                            value="asc"
                                        />
                                        asc
                                    </label>
                                </li>
                                <li class="text-xs uppercase font-normal my-3">origin:</li>
                                <li
                                    v-for="option in options"
                                    :key="option"
                                >
                                    <label>
                                        <input
                                            type="checkbox"
                                            :value="option"
                                            :checked="queriesOriginFilter.origin.includes(option)"
                                            @change="toggle(option)"
                                            class="checkbox checkbox-sm checkbox-accent"
                                        />
                                        {{ option.charAt(0).toUpperCase() + option.slice(1) }}
                                    </label>
                                </li>
                                <li class="text-xs border mb-2 -mx-4 !border-base-content/10 uppercase font-normal mb-1"></li>
                                <li>
                                    <label>
                                        <input
                                            type="checkbox"
                                            v-model="formattedQueriesStore.formatted"
                                            class="checkbox checkbox-sm checkbox-accent"
                                            @click="formattedQueriesStore.toggle()"
                                        />
                                        Prettify
                                    </label>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="flex w-full text-sm items-center justify-between">
            <div class="w-full">
                <div>
                    <SelectMenu
                        v-if="allRequests.length > 0"
                        @selected="timeStore.setSelectedRequest($event.id)"
                        class="w-auto !text-xs"
                        v-model:data="allRequests"
                    />
                </div>
            </div>
        </div>
    </div>
</template>
