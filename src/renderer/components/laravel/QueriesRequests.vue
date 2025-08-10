<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { Payload } from "@/types/Payload";
import { useTimeStore } from "@/store/time";
import { useQueriesPayloadStore } from "@/store/queries";
import { ExclamationTriangleIcon } from "@heroicons/vue/24/outline";
import { useQueryDuplicated } from "@/store/query-duplicated";

const timeStore = useTimeStore();
const queriesStore = useQueriesPayloadStore();
const duplicatesStore = useQueryDuplicated();

const searchInput = ref<HTMLInputElement | null>(null);

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

    if (timeStore.search?.trim()) {
        const searchLower = timeStore.search.toLowerCase();
        requests = requests.filter(
            (req) =>
                req.label?.toLowerCase().includes(searchLower) ||
                req.method?.toLowerCase().includes(searchLower) ||
                String(req.count).includes(searchLower) ||
                req.time.toString().includes(searchLower)
        );
    }

    requests.sort((a, b) => b.index - a.index);

    return requests;
});

const display = (id: string) => {
    duplicatesStore.showOnlyDuplicated = false;
    timeStore.setSelectedRequest(id);
};

const handleShortcut = (event: KeyboardEvent) => {
    const isMac = navigator.platform.toUpperCase().includes("MAC");
    if ((isMac && event.metaKey && event.key.toLowerCase() === "k") || (!isMac && event.ctrlKey && event.key.toLowerCase() === "k")) {
        event.preventDefault();
        searchInput.value?.focus();
    }
};

onMounted(() => {
    window.addEventListener("keydown", handleShortcut);
});

onBeforeUnmount(() => {
    window.removeEventListener("keydown", handleShortcut);
});
</script>

<template>
    <div
        class="flex flex-col"
        style="height: -webkit-fill-available"
    >
        <label class="input input-sm w-full mb-2">
            <svg
                class="h-[1em] opacity-50"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
            >
                <g
                    stroke-linejoin="round"
                    stroke-linecap="round"
                    stroke-width="2.5"
                    fill="none"
                    stroke="currentColor"
                >
                    <circle
                        cx="11"
                        cy="11"
                        r="8"
                    ></circle>
                    <path d="m21 21-4.3-4.3"></path>
                </g>
            </svg>
            <input
                ref="searchInput"
                type="search"
                class="grow"
                placeholder="Search"
            />
            <kbd class="kbd kbd-sm">⌘</kbd>
            <kbd class="kbd kbd-sm">K</kbd>
        </label>

        <div
            v-for="request in allRequests"
            :key="request.id"
            :class="{
                'hover:bg-base-300': request.id !== timeStore.selected,
                'bg-neutral text-neutral-content rounded-xs': request.id === timeStore.selected
            }"
            class="p-2 cursor-pointer focus:bg-primary border-b border-base-content/10"
            @click="display(request.id)"
        >
            <div class="flex justify-between gap-3 items-start">
                <span
                    class="line-clamp-2 break-words"
                    v-html="request.label ? request.label : 'Tinker'"
                ></span>
                <span class="text-xs font-normal">{{ request.time }}ms</span>
            </div>
            <div class="font-normal truncate flex justify-between">
                <div class="flex gap-2">
                    <span
                        :class="{
                            '!badge-ghost': request.id == timeStore.selected,
                            'badge-soft': request.id !== timeStore.selected
                        }"
                        class="badge badge-xs"
                        >{{ request.method }}
                    </span>

                    <div
                        v-if="duplicatesStore.hasDuplicatedByRequest(request.id)"
                        class="flex gap-2"
                    >
                        <ExclamationTriangleIcon class="text-warning w-4" />
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
