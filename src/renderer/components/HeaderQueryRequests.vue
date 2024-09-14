<template>
    <div
        v-if="timeStore.groups.length > 0"
        class="flex py-0.5 h-auto justify-between items-center gap-2 text-base-content"
    >
        <span class="font-normal text-[11px] select-none ml-1">{{ totalFiltered }} of {{ total }} queries</span>

        <div class="flex gap-2 text-sm items-center">
            <SelectMenu
                @selected="timeStore.setOrder($event.id)"
                class="w-[100px] dark:!bg-base-600 !text-xs"
                v-model:data="queryOrder"
            />

            <SelectMenu
                v-if="allRequests.length > 0"
                @selected="timeStore.setSelectedRequest($event.id)"
                class="w-[210px] !text-xs"
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

const allRequests = ref([]);

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

watch(
    timeStore.groups,
    (newGroups) => {
        allRequests.value = newGroups
            .map((group, index) => ({
                index: index + 1,
                id: group,
                label: `${index + 1} - ${timeStore.getTime(group)} - ${timeStore.getTotal(group).toFixed(2)}ms`
            }))
            .sort((a, b) => b.index - a.index);
        //
        // if (allRequests.value.length > 0) {
        //     const requestId = allRequests.value[allRequests.value.length - 1].id
        //
        //     timeStore.selected = requestId
        //     console.log('selected',timeStore.selected)
        // }
    },
    { immediate: true }
);
//
// watch(
//     timeStore.requests,
//     (request) => {
//        console.log(request)
//     },
//     { immediate: true }
// );
</script>
