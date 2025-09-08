<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { Payload } from "@/types/Payload";
import { useTimeStore } from "@/store/time";
import { useQueriesPayloadStore } from "@/store/queries";
import { BoltIcon, ExclamationTriangleIcon } from "@heroicons/vue/20/solid";
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
        count: queriesStore.payload.filter((payload: Payload) => payload.request_id == group).length,
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
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.3-4.3"></path>
                </g>
            </svg>
            <input
                ref="searchInput"
                v-model="timeStore.search"
                type="search"
                class="grow"
                placeholder="Search"
            />
            <kbd class="kbd kbd-sm">⌘</kbd>
            <kbd class="kbd kbd-sm">K</kbd>
        </label>

        <table class="table table-sm w-full">
            <thead>
            <tr>
                <th class="w-12">#</th>
                <th>Request</th>
                <th class="text-right">Time</th>
                <th class="text-right">Total Queries</th>
                <th class="text-right">Icons</th>
            </tr>
            </thead>
            <tbody>
            <tr
                v-for="request in allRequests"
                :key="request.id"
                :class="{
                        'hover:bg-base-300': request.id !== timeStore.selected,
                        'bg-neutral text-neutral-content': request.id === timeStore.selected
                    }"
                class="cursor-pointer"
                @click="display(request.id)"
            >
                <td class="font-mono text-left">{{ request.index }}</td>

                <td class="max-w-[250px] truncate">
                    <span v-html="request.label ? request.label : 'Tinker'"></span>
                    <span
                        :class="{
                                '!badge-ghost': request.id == timeStore.selected,
                                'badge-soft': request.id !== timeStore.selected
                            }"
                        class="badge badge-xs ml-2"
                    >
                            {{ request.method }}
                        </span>
                </td>

                <td class="text-right">
                    {{ request.time }}ms
                </td>

                <td class="text-right">
                    {{ request.count }}
                </td>

                <td class="text-right">
                    <div class="flex justify-end gap-2">
                        <BoltIcon
                            class="w-4"
                            :class="{
                                    'text-warning': queriesStore.hasExplainNodes(request.id),
                                    'text-base-content/30': !queriesStore.hasExplainNodes(request.id)
                                }"
                            title="This query has problematic nodes in the EXPLAIN plan."
                        />
                        <ExclamationTriangleIcon
                            class="w-4"
                            :class="{
                                    'text-error': duplicatesStore.requestsWithDuplicates.has(request.id),
                                    'text-base-content/30': !duplicatesStore.requestsWithDuplicates.has(request.id)
                                }"
                            title="This request has duplicates"
                        />
                    </div>
                </td>
            </tr>
            </tbody>
        </table>
    </div>
</template>

<style scoped></style>
