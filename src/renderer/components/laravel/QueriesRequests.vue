<script setup lang="ts">
import { computed } from "vue";
import { Payload } from "@/types/Payload";
import { useTimeStore } from "@/store/time";
import { useQueriesPayloadStore } from "@/store/queries";
import { useQueriesOriginFilter } from "@/store/queries-origin-filter";
import IconWarning from "@/components/Icons/IconWarning.vue";
import { useQueryDuplicated } from "@/store/query-duplicated";

const timeStore = useTimeStore();
const queriesStore = useQueriesPayloadStore();
const queriesOriginFilter = useQueriesOriginFilter();
const duplicatesStore = useQueryDuplicated();

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
    duplicatesStore.showOnlyDuplicated = false;
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
                'bg-neutral text-neutral-content rounded-md': request.id === timeStore.selected
            }"
            class="p-2 space-y-2 cursor-pointer focus:bg-primary"
            @click="display(request.id)"
        >
            <div class="flex justify-between gap-3 items-start">
                <span
                    class="line-clamp-2 break-words"
                    v-html="request.label ? request.label : 'Tinker'"
                ></span>
                <span class="text-sm font-semibold">{{ request.time }}ms</span>
            </div>
            <div class="font-normal truncate flex justify-between">
                <div class="flex gap-2">
                    <span
                        :class="{
                            '!badge-ghost': request.id == timeStore.selected,
                            'badge-soft': request.id !== timeStore.selected
                        }"
                        class="badge badge-sm"
                        >{{ request.method }}
                    </span>

                    <div
                        v-if="duplicatesStore.hasDuplicatedByRequest(request.id)"
                        class="flex gap-2"
                    >
                        <IconWarning class="text-warning w-4" />
                    </div>
                </div>
                <span>
                    {{ request.count }}
                </span>
            </div>
        </div>
    </div>
</template>

<style scoped></style>
