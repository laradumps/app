<template>
    <div
        v-if="timeStore.groups.length > 0"
        class="flex justify-between items-center gap-2 dark:text-slate-400"
    >
        <span class="font-semibold text-sm select-none">{{ total }}</span>

        <div class="flex gap-2 text-sm items-center">
            <SelectMenu
                @selected="timeStore.setOrder($event.id)"
                class="w-[100px] dark:!bg-slate-600 !text-xs"
                v-model:data="queryOrder"
            />
            <SelectMenu
                @selected="timeStore.setSelectedRequest($event.id)"
                class="w-[190px] !text-xs"
                v-model:data="allRequests"
            />
        </div>
    </div>
</template>

<script setup>
import { useTimeStore } from "@/store/time";
import SelectMenu from "@/components/SelectMenu.vue";
import { computed, ref } from "vue";

const totalPayload = ref(0);

const timeStore = useTimeStore();

const requests = timeStore.requests;
const groups = timeStore.groups;
const selected = timeStore.selected;

const props = defineProps({
    total: {
        type: Number,
        default: 0
    },
    payload: {
        type: Object
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
        label: "#" + (index + 1) + " - " + timeStore.getTotal(group).toFixed(2) + "ms (" + timeStore.getTime(group) + ")"
    }));

    requests.sort((a, b) => b.index - a.index);

    return requests;
});
</script>
