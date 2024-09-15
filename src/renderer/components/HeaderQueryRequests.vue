<template>
    <div
        v-if="timeStore.groups.length > 0"
        class="flex py-0.5 h-auto justify-between items-center gap-2 text-base-content"
    >
        <div class="flex gap-3 items-center">
            <span class="font-normal text-[11px] select-none ml-1">{{ totalFiltered }} of {{ total }} queries</span>

            <span v-show="totalDuplicatedFiltered > 0"
                  class="badge whitespace-nowrap uppercase text-[10px] bg-warning font-semibold text-warning-content"> {{ totalDuplicatedFiltered }} duplicated </span>
        </div>

        <div class="flex gap-2 text-sm items-center">
            <SelectMenu
                @selected="timeStore.setOrder($event.id)"
                class="w-[100px] dark:!bg-base-600 !text-xs"
                v-model:data="queryOrder"
            />

            <SelectMenu
                v-if="allRequests.length > 0"
                @selected="timeStore.setSelectedRequest($event.id)"
                class="w-[240px] !text-xs"
                v-model:data="allRequests"
            />
        </div>
    </div>
</template>

<script setup>
import { useTimeStore } from "@/store/time";
import SelectMenu from "@/components/SelectMenu.vue";
import { computed, onMounted, onUpdated, ref, watch } from "vue";

const timeStore = useTimeStore();

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
    totalDuplicatedFiltered: {
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
        label: "#" + (index + 1) + " - " + timeStore.getTime(group) + " - " + timeStore.getTotal(group).toFixed(2) + "ms"
    }));

    requests.sort((a, b) => b.index - a.index);

    return requests;
});
</script>
