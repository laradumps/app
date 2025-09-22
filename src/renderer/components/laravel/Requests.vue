<script setup lang="ts">
import { computed } from "vue";
import { useTimeStore } from "@/store/time";

const timeStore = useTimeStore();

const allRequests = computed(() => {
    let requests = timeStore.groups.map((group, index) => ({
        index: index + 1,
        id: group,
        label: timeStore.getUri(group),
        time: timeStore.getTotal(group).toFixed(2),
        method: timeStore.getMethod(group),
        origin: timeStore.getOrigin(group)
    }));

    requests.sort((a, b) => b.index - a.index);

    return requests;
});

const display = (id: string) => {
    timeStore.setSelectedRequest(id);
};
</script>

<template>
    <div
        class="flex flex-col gap-1"
        style="height: -webkit-fill-available"
    >
        <div
            v-for="request in allRequests"
            :key="request.id"
            :class="{
                'hover:bg-base-300': request.id !== timeStore.selected,
                'border-primary text-primary rounded-xs': request.id === timeStore.selected
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
                </div>
                <span> - </span>
            </div>
        </div>
    </div>
</template>

<style scoped></style>
