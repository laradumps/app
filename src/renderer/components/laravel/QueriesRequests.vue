<script setup lang="ts">
import { computed } from "vue";
import { Payload } from "@/types/Payload";
import { useTimeStore } from "@/store/time";
import { useQueriesPayloadStore } from "@/store/queries";
import { useQueriesOriginFilter } from "@/store/queries-origin-filter";

const timeStore = useTimeStore();
const queriesStore = useQueriesPayloadStore();
const queriesOriginFilter = useQueriesOriginFilter();

const allRequests = computed(() => {
    let requests = timeStore.groups.map((group, index) => ({
        index: index + 1,
        id: group,
        label: timeStore.getUri(group),
        time: timeStore.getTotal(group).toFixed(2),
        method: timeStore.getMethod(group),
        origin: timeStore.getOrigin(group),
        count: queriesStore.payload.filter((payload: Payload) => payload.request_id == group).length
    }));

    if (queriesOriginFilter.origin.length > 0) {
        requests = requests.filter((request) => queriesOriginFilter.origin.includes(timeStore.getOrigin(request.id)));
    }

    requests.sort((a, b) => b.index - a.index);

    return requests;
});

const display = (id: string) => {
    timeStore.setSelectedRequest(id);
};
</script>

<template>
    <div
        class="mr-2 flex flex-col gap-1"
        style="height: -webkit-fill-available"
    >
        <div
            v-for="request in allRequests"
            :key="request.id"
            :class="{
                'hover:bg-base-300 hover:rounded-md': request.id !== timeStore.selected,
                'bg-primary text-primary-content rounded-md': request.id === timeStore.selected
            }"
            class="p-2 space-y-2 cursor-pointer focus:bg-primary"
            @click="display(request.id)"
        >
            <div class="flex justify-between gap-3 items-start">
                <span
                    class="line-clamp-2 break-words"
                    v-html="request.label"
                ></span>
                <span class="text-sm font-semibold">{{ request.time }}ms</span>
            </div>
            <div class="font-semibold truncate flex justify-between">
                <span
                    :class="{
                        'badge-primary': request.id == timeStore.selected,
                        'badge-soft': request.id !== timeStore.selected
                    }"
                    class="badge badge-sm"
                    >{{ request.method }}</span
                >
                <span class="text-sm">{{ request.count }}</span>
            </div>
        </div>
    </div>
</template>

<style scoped></style>
