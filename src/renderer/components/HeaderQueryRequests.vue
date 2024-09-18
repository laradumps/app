<template>
    <div
        v-if="timeStore.groups.length > 0"
        class="absolute bg-base-100 pb-2 px-3 z-100 flex w-full h-auto justify-between items-center gap-2 text-base-content"
    >
        <div class="flex">
            <div class="flex flex-col">
                <span class="text-primary text-base whitespace-nowrap">{{ timeStore.get(timeStore.selected)?.total.toFixed(2) }} ms</span>
                <span class="text-[11px] uppercase">time</span>
            </div>

            <div class="divider divider-horizontal !mx-2"></div>

            <div class="flex flex-col">
                <span class="text-primary text-base">{{ totalFiltered }}</span>
                <span class="text-[11px] uppercase">queries</span>
            </div>

            <div
                v-show="duplicatesStore.totalByRequestId(timeStore.selected) > 0"
                class="divider divider-horizontal !mx-2"
            ></div>

            <div
                v-show="duplicatesStore.totalByRequestId(timeStore.selected) > 0"
                class="flex flex-col"
            >
                <span class="text-primary text-base">{{ duplicatesStore.totalByRequestId(timeStore.selected) }}</span>
                <span class="text-[11px] uppercase">duplicated</span>
            </div>
        </div>

        <div class="flex gap-2 text-sm items-center">
            <label class="label gap-2 !justify-start !text-left p-1.5">
                <input
                    type="checkbox"
                    v-model="formattedQueriesStore.formatted"
                    class="toggle toggle-xs toggle-primary"
                    @click="formattedQueriesStore.toggle()"
                />
                <span class="text-xs whitespace-nowrap font-normal uppercase">Prettify</span>
            </label>

            <SelectMenu
                @selected="timeStore.setOrder($event.id)"
                class="dark:!bg-base-600 !text-xs"
                v-model:data="queryOrder"
            />

            <SelectMenu
                v-if="allRequests.length > 0"
                @selected="timeStore.setSelectedRequest($event.id)"
                class="!text-xs"
                v-model:data="allRequests"
            />
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
        label: "#" + (index + 1) + " - <b>" + timeStore.getTotal(group).toFixed(2) + "ms</b>"
    }));

    requests.sort((a, b) => b.index - a.index);

    return requests;
});
</script>
