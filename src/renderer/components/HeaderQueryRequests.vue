<template>
    <div
        v-if="timeStore.groups.length > 0"
        class="flex py-0.5 h-auto justify-between items-center gap-2 text-base-content"
    >
        <div class="flex gap-2 ml-1 text-[11px] items-center">
            <div class="flex items-center gap-2 whitespace-nowrap font-normal uppercase">
                <span class="text-primary text-lg">{{ totalFiltered }}</span>
                queries
            </div>

            <span v-show="totalDuplicatedFiltered > 0"
                  class="badge whitespace-nowrap uppercase text-[11px] bg-warning text-warning-content"> {{ totalDuplicatedFiltered }} duplicated </span>
        </div>

        <div class="flex gap-2 text-sm items-center">
            <label
                class="label gap-2 !justify-start !text-left p-1.5"
            >
                <input
                    type="checkbox"
                    v-model="formattedQueriesStore.formatted"
                    class="toggle toggle-xs toggle-accent"
                    @click="formattedQueriesStore.toggle()"
                />
                <span class="text-xs whitespace-nowrap font-normal uppercase">Prettify</span>
            </label>

            <SelectMenu
                @selected="timeStore.setOrder($event.id)"
                class="w-[94px] dark:!bg-base-600 !text-xs"
                v-model:data="queryOrder"
            />

            <SelectMenu
                v-if="allRequests.length > 0"
                @selected="timeStore.setSelectedRequest($event.id)"
                class="w-[160px] !text-xs"
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

const timeStore = useTimeStore();
const formattedQueriesStore = useFormattedQueriesStore();

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
        label: "#" + (index + 1) + " - <b>" + timeStore.getTotal(group).toFixed(2) + "ms</b>"
    }));

    requests.sort((a, b) => b.index - a.index);

    return requests;
});
</script>
