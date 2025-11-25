<script setup lang="ts">
import { computed, defineProps, nextTick, onMounted, onUnmounted, ref, toRef, watch } from "vue";
import moment from "moment";
import SvgEmpty from "@/components/svg/SvgEmpty.vue";
import { useGlobalSearchStore } from "@/store/global-search";
import { useBrainStore, BrainProcess } from "@/store/brains";
import { CheckIcon, NoSymbolIcon, XMarkIcon, ArrowPathIcon, ChevronDownIcon } from "@heroicons/vue/24/solid";
import VueJsonPretty from "vue-json-pretty";
import { TrashIcon } from "@heroicons/vue/24/outline";
import tippy from "tippy.js";
import "tippy.js/dist/tippy.css";
import "tippy.js/themes/light-border.css";
import "tippy.js/themes/light.css";
import DumpLink from "@/components/dumps/DumpLink.vue";

const brainStore = useBrainStore();
const globalSearchStore = useGlobalSearchStore();

const forceRerenderCounter = ref(0);

const selectedProcess = ref<{
    id: string;
    className: string;
    tasks: any[];
    startedAt: string | null;
    updatedAt: string | null;
    ide_handle: any;
    process: any;
} | null>(null);

const selectedStatusFilter = ref<string | null>(null);
const selectedSortDirection = ref<"asc" | "desc">("desc");
const collapsedProcessGroups = ref<Record<string, boolean>>({});
const expandedTaskMap = ref<Record<string, boolean>>({});
const sfDumpInitialized = ref(false);

const localProcessItems = ref<Record<string, BrainProcess>>({});
const initializedDumpForTask = ref<Record<string, boolean>>({});

const props = defineProps<{
    items?: Record<string, BrainProcess>;
    inScreenWindow?: boolean;
}>();

const itemsProp = toRef(props, "items");

onMounted(() => {
    nextTick(() => {
        tippy("[data-tippy-content]", {
            allowHTML: true,
            theme: "dark",
            placement: "bottom-end"
        });
    });

    const escapeHandler = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
            closeDrawer();
        }
    };

    window.addEventListener("keydown", escapeHandler);

    onUnmounted(() => {
        window.removeEventListener("keydown", escapeHandler);
    });
});

watch(
    itemsProp,
    (val) => {
        localProcessItems.value = val ? { ...val } : {};
    },
    { immediate: true, deep: true }
);

watch(
    () => brainStore.brains,
    () => {
        forceRerenderCounter.value++;
    },
    { deep: true }
);

const effectiveItems = computed<Record<string, BrainProcess>>(() => {
    const hasLocal = Object.keys(localProcessItems.value).length > 0;
    return hasLocal ? localProcessItems.value : brainStore.brains;
});

const totalProcesses = computed(() => Object.keys(effectiveItems.value).length);

const filteredAndSortedProcesses = computed(() => {
    forceRerenderCounter.value;

    const items = Object.values(effectiveItems.value);

    return items
        .filter((processEntry) => {
            const query = globalSearchStore.search.toLowerCase();
            const matchesQuery = processEntry.className.toLowerCase().includes(query) || processEntry.run_process_id.toLowerCase().includes(query);

            const matchesStatus = !selectedStatusFilter.value || processEntry.process.tasks.some((task) => task.status === selectedStatusFilter.value);

            return matchesQuery && matchesStatus;
        })
        .sort((a, b) => {
            const timeA = new Date(a.updatedAt ?? 0).getTime();
            const timeB = new Date(b.updatedAt ?? 0).getTime();

            return selectedSortDirection.value === "asc" ? timeA - timeB : timeB - timeA;
        });
});

const groupedProcessesByRelativeTime = computed(() => {
    const groups: Record<string, BrainProcess[]> = {};

    for (const processEntry of filteredAndSortedProcesses.value) {
        const key = moment(processEntry.updatedAt ?? processEntry.startedAt).fromNow();

        if (!groups[key]) groups[key] = [];
        groups[key].push(processEntry);
    }

    return groups;
});

const toggleGroupVisibility = (groupKey: string) => {
    collapsedProcessGroups.value[groupKey] = !collapsedProcessGroups.value[groupKey];
};

const openProcessModal = (runId: string) => {
    const processEntry = filteredAndSortedProcesses.value.find((p) => p.run_process_id === runId || p.id === runId);
    if (!processEntry) return;

    const tasks = processEntry.process.tasks;

    const detailedTasks = tasks
        .map((task) => ({
            id: task.id,
            name: task.name,
            class: task.class,
            status: task.status,
            payload: task.payload,
            timestamp: task.timestamp,
            firstSeen: task.firstSeen,
            lastSeen: task.lastSeen,
            ide_handle: task.ide_handle ?? processEntry.ide_handle,
            meta: task.meta
        }))
        .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));

    selectedProcess.value = {
        id: processEntry.run_process_id,
        className: processEntry.className,
        tasks: detailedTasks,
        startedAt: processEntry.startedAt,
        updatedAt: processEntry.updatedAt,
        ide_handle: processEntry.ide_handle,
        process: processEntry.process
    };

    nextTick(() => {
        const drawer = document.getElementById("brain-drawer") as HTMLInputElement;

        setTimeout(() => {
            if (drawer) drawer.checked = true;
        }, 20);
    });
};

const formatDuration = (firstSeen?: number, lastSeen?: number) => {
    if (firstSeen == null || lastSeen == null || lastSeen < firstSeen) {
        return "-";
    }

    const ms = lastSeen - firstSeen;

    if (ms < 1) {
        return `${Math.round(ms * 1000)} µs`;
    }

    if (ms < 1000) {
        return `${trimZeroes(ms)} ms`;
    }

    return `${trimZeroes(ms / 1000)} s`;
};

const trimZeroes = (value: number): string => {
    const fixed = value.toFixed(2);
    if (fixed.endsWith(".00")) return fixed.replace(".00", "");
    return fixed.replace(/0+$/, "").replace(/\.$/, "");
};

watch(
    () => effectiveItems.value,
    (newItems) => {
        if (!selectedProcess.value) return;

        const updatedEntry = Object.values(newItems).find((p) => p.run_process_id === selectedProcess.value?.id || p.id === selectedProcess.value?.id);

        if (!updatedEntry) return;

        selectedProcess.value.tasks = updatedEntry.process.tasks
            .map((task) => ({
                id: task.id,
                name: task.name,
                class: task.class,
                status: task.status,
                payload: task.payload,
                timestamp: task.timestamp,
                firstSeen: task.firstSeen,
                lastSeen: task.lastSeen,
                ide_handle: task.ide_handle ?? updatedEntry.ide_handle,
                meta: task.meta
            }))
            .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));

        selectedProcess.value.startedAt = updatedEntry.startedAt;
        selectedProcess.value.updatedAt = updatedEntry.updatedAt;
        selectedProcess.value.ide_handle = updatedEntry.ide_handle;
        selectedProcess.value.process = updatedEntry.process;
    },
    { deep: true }
);

const sfDumpIds = computed(() => {
    if (!selectedProcess.value) return [];
    return selectedProcess.value.tasks.filter((t) => t.payload).map((t) => t.payload[1]);
});

const initializeSfDump = () => {
    if (sfDumpInitialized.value) return;

    sfDumpInitialized.value = true;

    nextTick(() => {
        sfDumpIds.value.forEach((id) => {
            try {
                window.Sfdump(`sf-dump-${id}`);
            } catch {
                console.warn(`Failed to initialize sf-dump for task ${id}`);
            }
        });
    });
};

const clearAll = () => {
    selectedProcess.value = null;
    brainStore.clear();
};

const closeDrawer = () => {
    const drawer = document.getElementById("brain-drawer") as HTMLInputElement;

    if (drawer) drawer.checked = false;
};

const splitClassName = (className: string) => {
    const position = className.lastIndexOf("\\");
    if (position === -1) return { prefix: "", suffix: className };

    return {
        prefix: className.substring(0, position + 1),
        suffix: className.substring(position + 1)
    };
};

const computeProcessDuration = (processEntry: BrainProcess) => {
    const tasks = processEntry.process.tasks;
    if (!tasks.length) return "-";

    const first = Math.min(...tasks.map((t) => t.firstSeen ?? t.timestamp));
    const last = Math.max(...tasks.map((t) => t.lastSeen ?? t.timestamp));

    if (!first || !last || last < first) return "-";

    const ms = last - first;

    if (ms < 1) return `${Math.round(ms * 1000)} µs`;
    if (ms < 1000) return `${trimZeroes(ms)} ms`;

    return `${trimZeroes(ms / 1000)} s`;
};

const toggleTaskExpanded = (task: any) => {
    const currentlyOpen = expandedTaskMap.value[task.id];
    expandedTaskMap.value[task.id] = !currentlyOpen;

    if (currentlyOpen) return;

    if (!initializedDumpForTask.value[task.id]) {
        initializedDumpForTask.value[task.id] = true;
        nextTick(() => initializeSfDump());
    }
};
</script>

<template>
    <div class="px-3">
        <div class="drawer drawer-end">
            <input
                id="brain-drawer"
                type="checkbox"
                class="drawer-toggle hidden"
            />

            <div class="drawer-side z-[400]">
                <label
                    for="brain-drawer"
                    class="drawer-overlay"
                ></label>

                <div class="menu bg-base-200 text-base-content min-h-full w-[calc(100vw-120px)] p-6 overflow-y-auto">
                    <div
                        v-if="selectedProcess"
                        class="space-y-6"
                    >
                        <div class="flex nav-bar justify-between items-center">
                            <div class="flex flex-col items-center gap-2">
                                <div class="text-sm">
                                    <span class="opacity-50">{{ splitClassName(selectedProcess.className).prefix }}</span>
                                    <span class="font-bold">{{ splitClassName(selectedProcess.className).suffix }}</span>
                                </div>

                                <div class="text-xs opacity-75">
                                    Started: {{ moment(selectedProcess.startedAt).format("HH:mm:ss") }} | Updated: {{ moment(selectedProcess.updatedAt).format("HH:mm:ss") }} | Duration:
                                    {{ computeProcessDuration(selectedProcess) }}
                                </div>
                            </div>
                        </div>

                        <div class="relative mx-auto w-full">
                            <div
                                v-for="(task, index) in selectedProcess.tasks"
                                :key="task.id"
                                class="flex flex-col items-center"
                            >
                                <details
                                    class="w-full rounded-lg border border-base-content/10 bg-base-300 shadow-sm mb-2"
                                    :open="expandedTaskMap[task.id]"
                                    @toggle="toggleTaskExpanded(task)"
                                >
                                    <summary class="flex items-center justify-between p-2 cursor-pointer select-none text-sm">
                                        <div class="flex items-center gap-2 break-all">
                                            <ChevronDownIcon
                                                class="w-4 h-4 transition-transform duration-200"
                                                :class="expandedTaskMap[task.id] ? 'rotate-0' : '-rotate-90'"
                                            />

                                            <span
                                                class="p-1 rounded-full"
                                                :class="{
                                                    'text-primary': task.status === 'processing',
                                                    'text-success': task.status === 'processed',
                                                    'text-error': task.status === 'error',
                                                    'text-warning': task.status === 'cancelled' || task.status === 'skipped',
                                                    'text-info': task.status === 'pending'
                                                }"
                                                :data-tippy-content="task.status"
                                            >
                                                <CheckIcon
                                                    v-if="task.status === 'processed'"
                                                    class="w-4 h-4"
                                                />
                                                <NoSymbolIcon
                                                    v-else-if="task.status === 'cancelled' || task.status === 'skipped'"
                                                    class="w-4 h-4"
                                                />
                                                <XMarkIcon
                                                    v-else-if="task.status === 'error'"
                                                    class="w-4 h-4"
                                                />
                                                <ArrowPathIcon
                                                    v-else-if="task.status === 'processing'"
                                                    class="w-4 h-4 animate-spin"
                                                />
                                                <NoSymbolIcon
                                                    v-else
                                                    class="w-4 h-4"
                                                />
                                            </span>

                                            <div class="font-mono text-xs">
                                                <span class="opacity-50">{{ splitClassName(task.class).prefix }}</span>
                                                <span class="font-bold">{{ splitClassName(task.class).suffix }}</span>
                                            </div>
                                        </div>

                                        <div class="text-xs opacity-60 whitespace-nowrap ml-2">
                                            {{ formatDuration(task.firstSeen, task.lastSeen) }}
                                        </div>
                                    </summary>

                                    <div class="px-4 py-3 border-t border-base-content/10 space-y-3">
                                        <div v-if="task.payload">
                                            <pre
                                                :id="`sf-dump-${task.payload?.[1]}`"
                                                class="sf-dump-debug overflow-auto text-xs break-all whitespace-pre-line"
                                                v-html="task.payload[0]"
                                            ></pre>
                                        </div>

                                        <div
                                            v-if="task.meta"
                                            class="space-y-1"
                                        >
                                            <div class="font-mono font-semibold text-xs">Meta</div>
                                            <VueJsonPretty
                                                :show-icon="true"
                                                :show-length="true"
                                                :show-line="false"
                                                :data="task.meta"
                                                :deep="2"
                                            />
                                        </div>
                                    </div>
                                </details>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="h-[calc(100vh-100px)]">
            <div class="flex items-center gap-1 justify-center">
                <Teleport to="#actions">
                    <button
                        v-if="itemsCount > 0"
                        @click="clearAll"
                        class="btn border border-base-content/5 btn-sm p-[0.5rem] btn-circle btn-soft"
                        data-tippy-content="Clear"
                    >
                        <TrashIcon class="size-4" />
                    </button>
                </Teleport>
            </div>

            <div
                v-if="filteredAndSortedProcesses.length > 0"
                class="overflow-auto"
                style="height: -webkit-fill-available"
            >
                <table class="table table-pin-rows table-zebra">
                    <thead>
                        <tr class="text-xs !bg-base-300 font-light text-base-content">
                            <th class="w-4">#</th>
                            <th>Process</th>
                            <th class="text-right">Tasks</th>
                            <th class="text-right w-20">Updated</th>
                        </tr>
                    </thead>

                    <tbody>
                        <template
                            v-for="(processList, timeKey) in groupedProcessesByRelativeTime"
                            :key="timeKey"
                        >
                            <tr class="bg-base-200 text-xs font-semibold text-center">
                                <td
                                    colspan="4"
                                    class="select-none"
                                >
                                    <span
                                        class="cursor-pointer link"
                                        @click="toggleGroupVisibility(timeKey)"
                                    >
                                        {{ timeKey }}
                                        <span class="ml-1">
                                            {{ collapsedProcessGroups[timeKey] ? "▼" : "▲" }}
                                        </span>
                                    </span>
                                </td>
                            </tr>

                            <tr
                                v-for="processEntry in processList"
                                v-if="!collapsedProcessGroups[timeKey]"
                                :key="processEntry.run_process_id"
                                @click="openProcessModal(processEntry.run_process_id)"
                                class="hover:bg-base-100 cursor-pointer"
                            >
                                <td>
                                    <div class="flex items-center justify-center">
                                        <CheckIcon
                                            v-if="processEntry.process.status === 'processed'"
                                            class="w-4 h-4 text-success"
                                        />
                                        <XMarkIcon
                                            v-else-if="processEntry.process.status === 'error'"
                                            class="w-4 h-4 text-error"
                                        />
                                        <ArrowPathIcon
                                            v-else-if="processEntry.process.status === 'processing'"
                                            class="w-4 h-4 text-info animate-spin"
                                        />
                                        <NoSymbolIcon
                                            v-else
                                            class="w-4 h-4"
                                        />
                                    </div>
                                </td>

                                <td class="break-all flex gap-1 flex-col">
                                    <p>
                                        <span class="font-normal">
                                            {{ splitClassName(processEntry.className).suffix }}
                                        </span>
                                    </p>

                                    <div
                                        v-if="processEntry.ide_handle && processEntry.ide_handle.class_name !== 'empty'"
                                        class="text-xs opacity-60"
                                    >
                                        <DumpLink
                                            class="flex font-normal h-full text-xs"
                                            :label="`${processEntry.ide_handle.class_name}:${processEntry.ide_handle.line}`"
                                            :ide-handler="processEntry.ide_handle"
                                        />
                                    </div>
                                </td>

                                <td class="whitespace-nowrap text-right">
                                    {{ processEntry.process.tasks.length }}
                                </td>

                                <td class="whitespace-nowrap text-right">
                                    {{ computeProcessDuration(processEntry) }}
                                </td>
                            </tr>
                        </template>
                    </tbody>
                </table>
            </div>

            <div
                v-else
                class="-mt-[90px] -ml-8 absolute flex items-center justify-center w-full"
                style="height: -webkit-fill-available"
            >
                <SvgEmpty class="w-30 opacity-25" />
                <div class="text-base-content/70">
                    <h1 class="text-lg font-semibold mb-2">Empty</h1>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
@reference "./../../styles.css";

:deep(.table thead) :where(th, td) {
    @apply p-2;
}
:deep(.table tbody) {
    :where(th, td) {
        @apply p-1.5 px-2;
    }
}
svg line {
    stroke-linecap: round;
    transition: stroke 0.3s ease;
}
</style>
