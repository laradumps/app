<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, toRef, watch } from 'vue';
import moment from 'moment';
import SvgEmpty from '@/components/svg/SvgEmpty.vue';
import { useGlobalSearchStore } from '@/store/global-search';
import { useBrainStore, BrainWorkflow, BrainAction } from '@/store/brains';
import { CheckIcon, NoSymbolIcon, XMarkIcon, ArrowPathIcon, ChevronDownIcon } from '@heroicons/vue/24/solid';
import VueJsonPretty from 'vue-json-pretty';
import { TrashIcon } from '@heroicons/vue/24/outline';
import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import 'tippy.js/themes/light-border.css';
import 'tippy.js/themes/light.css';
import DumpLink from '@/components/dumps/DumpLink.vue';

const brainStore = useBrainStore();
const globalSearchStore = useGlobalSearchStore();

const forceRerenderCounter = ref(0);

const selectedWorkflow = ref<{
    id: string;
    className: string;
    actions: any[];
    startedAt: string | null;
    updatedAt: string | null;
    ide_handle: any;
    workflow: any;
} | null>(null);

const selectedStatusFilter = ref<string | null>(null);
const selectedSortDirection = ref<'asc' | 'desc'>('desc');
const collapsedWorkflowGroups = ref<Record<string, boolean>>({});
const expandedActionMap = ref<Record<string, boolean>>({});

const localWorkflowItems = ref<Record<string, BrainWorkflow>>({});

const props = defineProps<{
    items?: Record<string, BrainWorkflow>;
    inScreenWindow?: boolean;
}>();

defineEmits(['open-screen-window']);

const itemsProp = toRef(props, 'items');

const escapeHandler = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
        closeDrawer();
    }
};

onMounted(() => {
    nextTick(() => {
        tippy('[data-tippy-content]', {
            allowHTML: true,
            theme: 'dark',
            placement: 'bottom-end'
        });
    });

    window.addEventListener('keydown', escapeHandler);
});

onUnmounted(() => {
    window.removeEventListener('keydown', escapeHandler);
});

watch(
    itemsProp,
    (val) => {
        localWorkflowItems.value = val ? { ...val } : {};
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

const effectiveItems = computed<Record<string, BrainWorkflow>>(() => {
    const hasLocal = Object.keys(localWorkflowItems.value).length > 0;
    return hasLocal ? localWorkflowItems.value : brainStore.brains;
});

const totalProcesses = computed(() => Object.keys(effectiveItems.value).length);

const filteredAndSortedProcesses = computed(() => {
    forceRerenderCounter.value;

    const items = Object.values(effectiveItems.value);

    return items
        .filter((workflowEntry) => {
            const query = globalSearchStore.search.toLowerCase();
            const matchesQuery =
                workflowEntry.className.toLowerCase().includes(query) ||
                workflowEntry.run_workflow_id.toLowerCase().includes(query);

            const matchesStatus =
                !selectedStatusFilter.value ||
                workflowEntry.workflow.actions.some((action) => action.status === selectedStatusFilter.value);

            return matchesQuery && matchesStatus;
        })
        .sort((a, b) => {
            const timeA = new Date(a.updatedAt ?? 0).getTime();
            const timeB = new Date(b.updatedAt ?? 0).getTime();

            return selectedSortDirection.value === 'asc' ? timeA - timeB : timeB - timeA;
        });
});

const groupedWorkflowByRelativeTime = computed(() => {
    const groups: Record<string, BrainWorkflow[]> = {};

    for (const workflowEntry of filteredAndSortedProcesses.value) {
        const key = moment(workflowEntry.updatedAt ?? workflowEntry.startedAt).fromNow();

        if (!groups[key]) groups[key] = [];
        groups[key].push(workflowEntry);
    }

    return groups;
});

const toggleGroupVisibility = (groupKey: string) => {
    collapsedWorkflowGroups.value[groupKey] = !collapsedWorkflowGroups.value[groupKey];
};

const openWorkflowModal = (runId: string) => {
    const workflowEntry = filteredAndSortedProcesses.value.find((p) => p.run_workflow_id === runId || p.id === runId);
    if (!workflowEntry) return;

    const actions = workflowEntry.workflow.actions;

    const detailedActions = actions
        .map((action: BrainAction) => ({
            id: action.id,
            name: action.name,
            class: action.class,
            status: action.status,
            payload: action.payload,
            timestamp: action.timestamp,
            firstSeen: action.firstSeen,
            lastSeen: action.lastSeen,
            ide_handle: action.ide_handle ?? workflowEntry.ide_handle,
            meta: action.meta
        }))
        .sort((a: BrainAction, b: BrainAction) => (a.timestamp ?? 0) - (b.timestamp ?? 0));

    selectedWorkflow.value = {
        id: workflowEntry.run_workflow_id,
        className: workflowEntry.className,
        actions: detailedActions,
        startedAt: workflowEntry.startedAt,
        updatedAt: workflowEntry.updatedAt,
        ide_handle: workflowEntry.ide_handle,
        workflow: workflowEntry.workflow
    };

    nextTick(() => {
        const drawer = document.getElementById('brain-drawer') as HTMLInputElement;

        setTimeout(() => {
            if (drawer) drawer.checked = true;

            initializeSfDump();
        }, 20);
    });
};

const formatDuration = (firstSeen?: number, lastSeen?: number) => {
    if (firstSeen == null || lastSeen == null || lastSeen < firstSeen) {
        return '-';
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
    if (fixed.endsWith('.00')) return fixed.replace('.00', '');
    return fixed.replace(/0+$/, '').replace(/\.$/, '');
};

watch(
    () => effectiveItems.value,
    (newItems) => {
        if (!selectedWorkflow.value) return;

        const updatedEntry = Object.values(newItems).find(
            (p) => p.run_workflow_id === selectedWorkflow.value?.id || p.id === selectedWorkflow.value?.id
        );

        if (!updatedEntry) return;

        selectedWorkflow.value.actions = updatedEntry.workflow.actions
            .map((action: BrainAction) => ({
                id: action.id,
                name: action.name,
                class: action.class,
                status: action.status,
                payload: action.payload,
                timestamp: action.timestamp,
                firstSeen: action.firstSeen,
                lastSeen: action.lastSeen,
                ide_handle: action.ide_handle ?? updatedEntry.ide_handle,
                meta: action.meta
            }))
            .sort((a: BrainAction, b: BrainAction) => (a.timestamp ?? 0) - (b.timestamp ?? 0));

        selectedWorkflow.value.startedAt = updatedEntry.startedAt;
        selectedWorkflow.value.updatedAt = updatedEntry.updatedAt;
        selectedWorkflow.value.ide_handle = updatedEntry.ide_handle;
        selectedWorkflow.value.workflow = updatedEntry.workflow;
    },
    { deep: true }
);

const initializeSfDump = () => {
    selectedWorkflow.value.actions.forEach((action) => {
        const sfDumpId = action.payload[1];
        try {
            const sfDump = document.getElementById(`sf-dump-${sfDumpId}`);
            if (sfDump && !sfDump.hasAttribute('has-dump-js')) {
                window.Sfdump(`sf-dump-${sfDumpId}`);
                sfDump.setAttribute('has-dump-js', 'true');
            }
        } catch {
            console.warn(`Failed to initialize sf-dump for task ${sfDumpId}`);
        }
    });
};

const clearAll = () => {
    selectedWorkflow.value = null;
    brainStore.clear();
};

const closeDrawer = () => {
    const drawer = document.getElementById('brain-drawer') as HTMLInputElement;

    if (drawer) drawer.checked = false;
};

const splitClassName = (className: string) => {
    const position = className.lastIndexOf('\\');
    if (position === -1) return { prefix: '', suffix: className };

    return {
        prefix: className.substring(0, position + 1),
        suffix: className.substring(position + 1)
    };
};

const computeWorkflowDuration = (workflowEntry: BrainWorkflow) => {
    const actions = workflowEntry.workflow.actions;
    if (!actions.length) return '-';

    const first = Math.min(...actions.map((action: BrainAction) => action.firstSeen ?? action.timestamp));
    const last = Math.max(...actions.map((action: BrainAction) => action.lastSeen ?? action.timestamp));

    if (!first || !last || last < first) return '-';

    const ms = last - first;

    if (ms < 1) return `${Math.round(ms * 1000)} µs`;
    if (ms < 1000) return `${trimZeroes(ms)} ms`;

    return `${trimZeroes(ms / 1000)} s`;
};

const toggleActionExpanded = (action: any) => {
    const isOpen = expandedActionMap.value[action.id];
    expandedActionMap.value[action.id] = !isOpen;
};
</script>

<template>
    <div>
        <!-- Actions bar -->
        <div class="-mt-3 flex items-center justify-between w-full border-b border-base-content/10 h-9 px-3">
            <!-- Left: title -->
            <span class="text-[10px] font-bold uppercase tracking-widest text-base-content/70 select-none">Brain</span>

            <!-- Right: actions -->
            <div class="flex items-center gap-1">
                <button
                    v-if="totalProcesses > 0"
                    @click="clearAll"
                    class="btn btn-ghost btn-circle btn-sm text-error/70 hover:text-error"
                    data-tippy-content="Clear"
                >
                    <TrashIcon class="size-4" />
                </button>
            </div>
        </div>

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

                    <div
                        class="menu bg-base-100 text-base-content min-h-full w-[calc(100vw-120px)] p-5 overflow-y-auto"
                    >
                        <div
                            v-if="selectedWorkflow"
                            class="space-y-6"
                        >
                            <div class="flex nav-bar justify-between">
                                <div class="flex text-left items-start flex-col gap-2">
                                    <div class="text-sm">
                                        <span class="opacity-50">{{
                                            splitClassName(selectedWorkflow.className).prefix
                                        }}</span>
                                        <span class="font-bold">{{
                                            splitClassName(selectedWorkflow.className).suffix
                                        }}</span>
                                    </div>

                                    <div class="text-xs opacity-75">
                                        Started: {{ moment(selectedWorkflow.startedAt).format('HH:mm:ss') }} | Duration:
                                        {{ computeWorkflowDuration(selectedWorkflow) }}
                                    </div>
                                </div>
                            </div>

                            <div class="relative mx-auto w-full">
                                <div
                                    v-for="(action, index) in selectedWorkflow.actions"
                                    :key="action.id"
                                    class="flex flex-col items-center"
                                >
                                    <div
                                        class="w-full rounded-lg bg-base-300 border border-base-content/10 shadow-sm mb-2"
                                    >
                                        <div
                                            class="border-b border-base-content/10 flex items-center justify-between p-2 cursor-pointer select-none text-sm"
                                            @click="toggleActionExpanded(action)"
                                        >
                                            <div class="flex items-center gap-2 break-all">
                                                <ChevronDownIcon
                                                    class="w-4 h-4 transition-all"
                                                    :class="expandedActionMap[action.id] ? 'rotate-0' : '-rotate-90'"
                                                />

                                                <span
                                                    class="p-1 rounded-full"
                                                    :class="{
                                                        'text-primary': action.status === 'processing',
                                                        'text-success': action.status === 'processed',
                                                        'text-error': action.status === 'error',
                                                        'text-warning':
                                                            action.status === 'cancelled' ||
                                                            action.status === 'skipped',
                                                        'text-info': action.status === 'pending'
                                                    }"
                                                    :data-tippy-content="action.status"
                                                >
                                                    <CheckIcon
                                                        v-if="action.status === 'processed'"
                                                        class="w-4 h-4"
                                                    />
                                                    <NoSymbolIcon
                                                        v-else-if="
                                                            action.status === 'cancelled' || action.status === 'skipped'
                                                        "
                                                        class="w-4 h-4"
                                                    />
                                                    <XMarkIcon
                                                        v-else-if="action.status === 'error'"
                                                        class="w-4 h-4"
                                                    />
                                                    <ArrowPathIcon
                                                        v-else-if="action.status === 'processing'"
                                                        class="w-4 h-4 animate-spin"
                                                    />
                                                    <NoSymbolIcon
                                                        v-else
                                                        class="w-4 h-4"
                                                    />
                                                </span>

                                                <div class="text-sm tracking-wide">
                                                    <span class="opacity-60">{{
                                                        splitClassName(action.class).prefix
                                                    }}</span>
                                                    <span class="font-semibold">{{
                                                        splitClassName(action.class).suffix
                                                    }}</span>
                                                </div>
                                            </div>

                                            <div class="text-xs opacity-60 whitespace-nowrap ml-2">
                                                {{ formatDuration(action.firstSeen, action.lastSeen) }}
                                            </div>
                                        </div>

                                        <div
                                            v-show="expandedActionMap[action.id]"
                                            class="px-4 py-3 bg-base-200 rounded-lg space-y-3"
                                        >
                                            <div v-if="action.payload">
                                                <pre
                                                    class="sf-dump-debug overflow-auto text-xs break-all whitespace-pre-line"
                                                    v-html="action.payload[0]"
                                                ></pre>
                                            </div>

                                            <div
                                                v-if="action.meta"
                                                class="space-y-1"
                                            >
                                                <div class="border-t py-2 border-base-content/5 text-sm">Meta</div>
                                                <VueJsonPretty
                                                    :show-icon="true"
                                                    :show-length="true"
                                                    :show-line="false"
                                                    :data="action.meta"
                                                    :deep="2"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div :class="inScreenWindow ? 'h-[calc(100vh-100px)]' : 'h-[calc(100vh-140px)]'">
                <div
                    v-if="filteredAndSortedProcesses.length > 0"
                    class="overflow-auto"
                    style="height: -webkit-fill-available"
                >
                    <table class="table table-pin-rows table-zebra">
                        <thead>
                            <tr class="text-xs !bg-base-300 font-light text-base-content">
                                <th class="w-4">#</th>
                                <th>Workflow</th>
                                <th class="w-20 text-center">Actions</th>
                                <th class="w-20 text-right">Created At</th>
                                <th class="text-right w-20">Duration</th>
                            </tr>
                        </thead>

                        <tbody>
                            <template
                                v-for="(workflowList, timeKey) in groupedWorkflowByRelativeTime"
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
                                                {{ collapsedWorkflowGroups[timeKey] ? '▼' : '▲' }}
                                            </span>
                                        </span>
                                    </td>
                                </tr>

                                <tr
                                    v-for="workflowEntry in workflowList"
                                    v-if="!collapsedWorkflowGroups[timeKey]"
                                    :key="workflowEntry.run_workflow_id"
                                    @click="openWorkflowModal(workflowEntry.run_workflow_id)"
                                    class="hover:bg-base-100 cursor-pointer"
                                >
                                    <td>
                                        <div class="flex items-center justify-center">
                                            <CheckIcon
                                                v-if="workflowEntry.workflow.status === 'processed'"
                                                class="w-4 h-4 text-success"
                                            />
                                            <XMarkIcon
                                                v-else-if="workflowEntry.workflow.status === 'error'"
                                                class="w-4 h-4 text-error"
                                            />
                                            <ArrowPathIcon
                                                v-else-if="workflowEntry.workflow.status === 'processing'"
                                                class="w-4 h-4 text-info animate-spin"
                                            />
                                            <NoSymbolIcon
                                                v-else
                                                class="w-4 h-4"
                                            />
                                        </div>
                                    </td>

                                    <td class="break-all flex gap-2 flex-col">
                                        <p>
                                            <span class="font-normal">
                                                {{ splitClassName(workflowEntry.className).suffix }}
                                            </span>
                                        </p>

                                        <div
                                            v-if="
                                                workflowEntry.ide_handle &&
                                                workflowEntry.ide_handle.class_name !== 'empty'
                                            "
                                            class="text-xs opacity-60"
                                        >
                                            <DumpLink
                                                class="flex font-normal h-full text-xs"
                                                :label="`${workflowEntry.ide_handle.class_name}:${workflowEntry.ide_handle.line}`"
                                                :ide-handler="workflowEntry.ide_handle"
                                            />
                                        </div>
                                    </td>

                                    <td class="whitespace-nowrap text-center">
                                        {{ workflowEntry.workflow.actions.length }}
                                    </td>

                                    <td class="text-right">
                                        {{
                                            moment(workflowEntry.updatedAt ?? workflowEntry.startedAt).format(
                                                'HH:mm:ss'
                                            )
                                        }}
                                    </td>
                                    <td class="whitespace-nowrap text-right">
                                        {{ computeWorkflowDuration(workflowEntry) }}
                                    </td>
                                </tr>
                            </template>
                        </tbody>
                    </table>
                </div>

                <div
                    v-else
                    class="-mt-[90px] -ml-8 absolute flex items-center justify-center w-full pointer-events-none"
                    style="height: -webkit-fill-available"
                >
                    <SvgEmpty class="w-30 opacity-25" />
                    <div class="text-base-content/70">
                        <h1 class="text-lg font-semibold mb-2">Empty</h1>
                    </div>
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
