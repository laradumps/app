<script setup>
import { useTimeStore } from "@/store/time";
import SelectMenu from "@/components/SelectMenu.vue";
import { computed } from "vue";
import { useFormattedQueriesStore } from "@/store/formatted-queries";
import { useQueryDuplicated } from "@/store/query-duplicated";
import { useQueriesOriginFilter } from "@/store/queries-origin-filter.js";

const timeStore = useTimeStore();
const formattedQueriesStore = useFormattedQueriesStore();
const duplicatesStore = useQueryDuplicated();
const queriesOriginFilter = useQueriesOriginFilter();

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
</script>

<template>
    <div class="gap-2 flex flex-col z-100 h-auto w-full">
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

                <div class="flex gap-5 items-center">
                    <label class="flex flew-row gap-2 text-sm opacity-90">
                        <input
                            type="checkbox"
                            v-model="formattedQueriesStore.formatted"
                            class="checkbox checkbox-sm"
                            @click="formattedQueriesStore.toggle()"
                        />
                        Prettify
                    </label>
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
