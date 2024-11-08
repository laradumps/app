<template>
    <div class="absolute top-[2.8rem] bg-base-100 space-y-1 px-4 pb-3 z-100 h-auto w-full">
        <div
            v-if="timeStore.groups.length > 0"
            class=" justify-between items-center gap-4 text-base-content"
        >
            <div class="flex justify-between">
                <div class="flex w-full items-center">
                    <div class="flex flex-row-reverse gap-3">
                        <span class="text-primary text-base whitespace-nowrap">{{ timeStore.get(timeStore.selected)?.total.toFixed(2) }} ms</span>
                        <span class="text-[11px] uppercase">time</span>
                    </div>

                    <div class="divider divider-horizontal !mx-1.5"></div>

                    <div class="flex flex-row-reverse gap-3">
                        <span class="text-primary text-base whitespace-nowrap">{{ totalFiltered }}</span>
                        <span class="text-[11px] uppercase">queries</span>
                    </div>

                    <div
                        v-show="duplicatesStore.totalByRequestId(timeStore.selected) > 0"
                        class="divider divider-horizontal !mx-1.5"
                    ></div>

                    <div
                        v-show="duplicatesStore.totalByRequestId(timeStore.selected) > 0"
                        class="flex flex-row-reverse gap-3"
                    >
                        <span class="text-primary text-base">{{ duplicatesStore.totalByRequestId(timeStore.selected) }}</span>
                        <span class="text-[11px] uppercase">duplicated</span>
                    </div>
                </div>

                <div>
                    <span class="label gap-2 !justify-end !text-left p-1.5">
                                        <input
                                            type="checkbox"
                                            v-model="formattedQueriesStore.formatted"
                                            class="toggle toggle-xs toggle-primary"
                                            @click="formattedQueriesStore.toggle()"
                                        />
                                        <span class="text-[11px] whitespace-nowrap font-normal uppercase">Prettify</span>
                                    </span>
                </div>


            </div>

        </div>

        <div class="flex gap-3 w-full text-sm items-center justify-between">
            <div class="w-full">
                <span class="text-[11px] uppercase">Request</span>
                <div>
                    <SelectMenu
                        v-if="allRequests.length > 0"
                        @selected="timeStore.setSelectedRequest($event.id)"
                        class="w-auto !text-xs"
                        v-model:data="allRequests"
                    />
                </div>
            </div>
            <div>
                <span class="text-[11px] uppercase">Order</span>
                <div>
                    <SelectMenu
                        @selected="timeStore.setOrder($event.id)"
                        class="dark:!bg-base-600 !text-xs !w-[100px]"
                        v-model:data="queryOrder"
                    />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { useTimeStore } from "@/store/time";
import SelectMenu from "@/components/SelectMenu.vue";
import { computed, ref } from "vue";
import { useFormattedQueriesStore } from "@/store/formatted-queries";
import { useQueryDuplicated } from "@/store/query-duplicated";

const timeStore = useTimeStore();
const formattedQueriesStore = useFormattedQueriesStore();
const duplicatesStore = useQueryDuplicated();

const requests = timeStore.requests;
const groups = timeStore.groups;
const selected = ref();

const props = defineProps({
    total: {
        type: Number,
        default: 0
    },
    payload: {
        type: Object
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

const queryOrder = computed(() => {
    return [
        {
            id: false,
            label: "default"
        },
        {
            id: true,
            label: "desc"
        },
        {
            id: false,
            label: "asc"
        }
    ];
});

const allRequests = computed(() => {
    let requests = timeStore.groups.map((group, index) => ({
        index: index + 1,
        id: group,
        label: `#${index + 1} - <b>${timeStore.getTotal(group).toFixed(2)}ms</b> - ${timeStore.getUri(group)} (${timeStore.getMethod(group)})`
    }));

    requests.sort((a, b) => b.index - a.index);

    return requests;
});
</script>
