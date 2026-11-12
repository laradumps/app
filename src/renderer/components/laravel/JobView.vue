<script setup lang="ts">
import { Job, useJobStore } from '@/store/jobs';
import { useScreenStore } from '@/store/screen';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);
import { PlayIcon, ChevronDownIcon } from '@heroicons/vue/24/outline';
import { CheckIcon, XMarkIcon, ArrowPathIcon, InformationCircleIcon } from '@heroicons/vue/24/solid';

import EmptyState from '@/components/common/EmptyState.vue';
import { usePauseJobsStore } from '@/store/pauses';
import IconPause from '@/components/Icons/IconPause.vue';
import CodeSnippet from '@/components/CodeSnippet.vue';
import { useGlobalSearchStore } from '@/store/global-search';
import { FunnelIcon } from '@heroicons/vue/24/outline';
import { FunnelIcon as FunnelSolidIcon } from '@heroicons/vue/24/solid';
import DumpLink from '@/components/dumps/DumpLink.vue';
import { useCurrentProject } from '@/store/current-project';
import IconHorizon from '@/components/Icons/IconHorizon.vue';
import ViewToolbar from '@/components/common/ViewToolbar.vue';
import IconButton from '@/components/common/IconButton.vue';
import PauseBanner from '@/components/common/PauseBanner.vue';
import FilterChip from '@/components/common/FilterChip.vue';
import { useRowExpand } from '@/composables/useRowExpand';

const jobStore = useJobStore();
const screenStore = useScreenStore();
const pauseJobsStore = usePauseJobsStore();
const globalSearchStore = useGlobalSearchStore();
const currentProjectStore = useCurrentProject();

const forceUpdate = ref(0);
const { openId, isOpen, toggle, close, onRowKeydown } = useRowExpand();
const messageLimit = ref(true);
const focusedJobId = ref<string | null>(null);
const statusFilter = ref<string | null>(null);
const sortBy = ref<'display_name' | 'duration' | 'pushed_time'>('pushed_time');
const sortDirection = ref<'asc' | 'desc'>('desc');
const collapsedGroups = ref<Record<string, boolean>>({});
const horizonUrl = ref<string | null>(null);
const viewportWidth = ref(window.innerWidth);

let refreshInterval: ReturnType<typeof setInterval> | null = null;

const handleResize = () => {
    viewportWidth.value = window.innerWidth;
};

const props = defineProps<{
    items: Record<string, Job>;
    inScreenWindow: boolean;
    hideHeader?: boolean;
    isSplit?: boolean;
}>();

const isSplit = computed(() => props.isSplit === true);
const hideOriginColumn = computed(() => viewportWidth.value < 650 || isSplit.value);
const columnCount = computed(() => {
    if (isSplit.value) return 2;
    if (hideOriginColumn.value) return 3;
    return 4;
});

defineEmits(['open-screen-window']);

const toggleGroup = (timeKey: string) => {
    collapsedGroups.value[timeKey] = !collapsedGroups.value[timeKey];
};

const selectedStatus = (status: string) => {
    if (statusFilter.value === status) {
        statusFilter.value = null;

        return;
    }

    statusFilter.value = status;
};

const sourceJobs = computed(() => {
    if (props.inScreenWindow) {
        return props.items || {};
    }

    return jobStore.jobs;
});

const jobs = computed(() => {
    forceUpdate.value;

    const items = sourceJobs.value;

    return Object.values(items)
        .filter((job) => {
            const searchTerm = globalSearchStore.search.toLowerCase();
            const matchesSearch =
                job.display_name.toLowerCase().includes(searchTerm) ||
                job.job_id.includes(searchTerm) ||
                job.job[0].includes(searchTerm);

            const matchesStatus = !statusFilter.value || job.status === statusFilter.value;

            return matchesSearch && matchesStatus;
        })
        .sort((a, b) => {
            const getValue = (job: Job) => {
                if (sortBy.value === 'duration') {
                    const start = new Date(job.start_time ?? 0).getTime();
                    const end = new Date(job.end_time ?? 0).getTime();
                    return end - start;
                }
                if (sortBy.value === 'display_name') {
                    return job.display_name.toLowerCase();
                }
                return new Date(job.pushed_time ?? 0).getTime();
            };

            const aVal = getValue(a);
            const bVal = getValue(b);

            if (aVal < bVal) return sortDirection.value === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDirection.value === 'asc' ? 1 : -1;
            return 0;
        });
});

const visibleLimit = ref(jobStore.pageSize);
const listRef = ref<HTMLElement | null>(null);
const listTopRef = ref<HTMLElement | null>(null);
const listBottomRef = ref<HTMLElement | null>(null);

const visibleJobs = computed(() => jobs.value.slice(0, visibleLimit.value));

const hasMore = computed(() => jobs.value.length > visibleLimit.value);

const scrollListTo = (el: HTMLElement | null, block: 'start' | 'end') => {
    const scroller = listRef.value;
    if (!scroller || !el) {
        return;
    }

    const top = block === 'start' ? 0 : scroller.scrollHeight - scroller.clientHeight;
    scroller.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
};

const loadMore = async () => {
    visibleLimit.value += jobStore.pageSize;
    await nextTick();
    scrollListTo(listBottomRef.value, 'end');
};

const loadNewEntries = async () => {
    jobStore.loadIncoming(true);
    visibleLimit.value = jobStore.pageSize;
    await nextTick();
    scrollListTo(listTopRef.value, 'start');
};

watch([statusFilter, () => globalSearchStore.search], () => {
    visibleLimit.value = jobStore.pageSize;
});

const groupedJobsByRelativeTime = computed(() => {
    const groups: Record<string, Job[]> = {};

    for (const job of visibleJobs.value) {
        const timeKey = dayjs(job.pushed_time ?? job.start_time).fromNow();
        if (!groups[timeKey]) {
            groups[timeKey] = [];
        }
        groups[timeKey].push(job);
    }

    return groups;
});

const toggleSort = (field: typeof sortBy.value) => {
    if (sortBy.value === field) {
        sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';

        return;
    }

    sortBy.value = field;
    sortDirection.value = 'asc';
};

const statusCounts = computed(() => {
    const items = sourceJobs.value;
    return Object.values(items).reduce(
        (acc, job) => {
            acc[job.status] = (acc[job.status] || 0) + 1;
            return acc;
        },
        {} as Record<string, number>
    );
});

const isFiltering = computed(() => !!statusFilter.value);

watch(openId, (id) => {
    messageLimit.value = true;

    const job = id && jobs.value.find((item) => item.job_id === id);
    if (!job) return;

    fetchAppUrl();

    nextTick(() => {
        const sfDump = document.getElementById(`sf-dump-${job.job[1]}`);
        if (sfDump && !sfDump.hasAttribute('has-dump-js')) {
            sfDump.setAttribute('has-dump-js', 'true');
            window.Sfdump(`sf-dump-${job.job[1]}`);
        }
    });
});

const fetchAppUrl = () => {
    const projectPath = currentProjectStore.projectInfo?.path;
    if (!projectPath) {
        horizonUrl.value = null;
        return;
    }

    window.ipcRenderer.once('storage.get-app-url.reply', (event, url: string | null) => {
        horizonUrl.value = url || null;
    });
    window.ipcRenderer.send('storage.get-app-url', projectPath);
};

const statusToHorizonSegment = (status: string) => {
    const segments: Record<string, string> = {
        Processed: 'completed',
        Failed: 'failed',
        Queued: 'pending',
        Processing: 'running'
    };

    return segments[status] ?? 'pending';
};

const openInHorizon = (job: Job) => {
    if (!horizonUrl.value) return;

    const segment = statusToHorizonSegment(job.status);
    const url = `${horizonUrl.value.replace(/\/$/, '')}/horizon/jobs/${segment}/${job.job_id}`;
    window.ipcRenderer.send('main:openLink', url);
};

const focusJob = async (id: string) => {
    statusFilter.value = null;
    collapsedGroups.value = {};

    if (!jobStore.jobs[id] && jobStore.incoming[id]) {
        jobStore.loadIncoming(true);
    }

    await nextTick();

    const index = jobs.value.findIndex((job) => job.job_id === id);
    if (index >= visibleLimit.value) {
        visibleLimit.value = (Math.floor(index / jobStore.pageSize) + 1) * jobStore.pageSize;
    }

    openId.value = id;
    await nextTick();

    const row = document.querySelector(`[data-job-id="${id}"]`);
    if (row) {
        row.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }

    focusedJobId.value = id;
    setTimeout(() => {
        if (focusedJobId.value === id) {
            focusedJobId.value = null;
        }
    }, 2500);

    jobStore.clearFocus();
};

watch(
    () => jobStore.focusJobId,
    (id) => {
        if (id) {
            focusJob(id);
        }
    }
);

const backToDump = () => {
    const origin = jobStore.origin;

    close();

    if (!origin) {
        return;
    }

    screenStore.activeScreen(origin.screen);
    jobStore.clearOrigin();

    if (!origin.id) {
        return;
    }

    nextTick(() => {
        const el = document.getElementById(`ld-anchor-${origin.id}`);
        if (!el) {
            return;
        }

        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        el.classList.add('ld-dump-focus');
        setTimeout(() => el.classList.remove('ld-dump-focus'), 2100);
    });
};

const clear = () => {
    if (pauseJobsStore.is_paused) {
        pauseJobsStore.toggle();
    }

    close();
    jobStore.clear();
    visibleLimit.value = jobStore.pageSize;
};

const duration = (startTime: any, endTime: any) => {
    if (!startTime || !endTime) return '-';

    const durationMs = new Date(endTime).getTime() - new Date(startTime).getTime();
    if (durationMs < 1000) return `${durationMs} ms`;

    return `${(durationMs / 1000).toFixed(2)} s`;
};

const statusPill = (status: string): string =>
    ({
        Processed: 'bg-success/10 text-success border-success/30',
        Failed: 'bg-error/10 text-error border-error/30',
        Processing: 'bg-primary/10 text-primary border-primary/30',
        Queued: 'bg-warning/10 text-warning border-warning/30'
    })[status] ?? 'bg-base-300 text-base-content/70 border-base-300';

onMounted(() => {
    if (jobStore.focusJobId) {
        focusJob(jobStore.focusJobId);
    }

    window.addEventListener('resize', handleResize);

    refreshInterval = setInterval(() => {
        forceUpdate.value++;
    }, 60_000);
});

onBeforeUnmount(() => {
    window.removeEventListener('resize', handleResize);
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }
});

const toggleMessageLimit = () => {
    messageLimit.value = !messageLimit.value;
};
</script>

<template>
    <div class="flex flex-col h-full max-h-full min-h-0 min-w-0 overflow-hidden">
        <!-- Actions Bar -->
        <ViewToolbar
            :can-clear="jobs.length > 0"
            @clear="clear"
            v-if="!hideHeader"
            class="relative z-20 shrink-0 bg-base-200"
            :count="jobs.length"
            noun="job"
        >
            <template #chips>
                <FilterChip
                    v-if="statusFilter"
                    :label="statusFilter"
                    @remove="statusFilter = null"
                />
            </template>

            <template #filter>
                <div class="dropdown dropdown-bottom dropdown-end">
                    <IconButton
                        tabindex="0"
                        role="button"
                        label="Filter"
                        :active="isFiltering"
                    >
                        <FunnelIcon
                            v-if="!isFiltering"
                            class="w-4"
                        />
                        <FunnelSolidIcon
                            v-else
                            class="w-4 text-primary"
                        />
                    </IconButton>

                    <ul
                        tabindex="0"
                        class="p-2 shadow-xl dropdown-content menu bg-base-200/95 backdrop-blur-xl rounded-xl border border-base-content/10 z-[100] w-52"
                    >
                        <li
                            :class="{
                                'text-primary': statusFilter === 'Queued'
                            }"
                            @click="selectedStatus('Queued')"
                        >
                            <a
                                class="!text-xs"
                                v-text="`Queued (${statusCounts.Queued || 0})`"
                            ></a>
                        </li>
                        <li
                            :class="{
                                'text-primary': statusFilter == 'Processed'
                            }"
                            @click="selectedStatus('Processed')"
                        >
                            <a
                                class="!text-xs"
                                v-text="`Processed (${statusCounts.Processed || 0})`"
                            ></a>
                        </li>
                        <li
                            :class="{
                                'text-primary': statusFilter === 'Failed'
                            }"
                            @click="selectedStatus('Failed')"
                        >
                            <a
                                class="!text-xs"
                                v-text="`Failed (${statusCounts.Failed || 0})`"
                            ></a>
                        </li>
                    </ul>
                </div>
            </template>

            <template #right>
                <IconButton
                    :label="pauseJobsStore.is_paused ? $t('resume') : $t('pause')"
                    variant="base"
                    @click="pauseJobsStore.toggle()"
                >
                    <PlayIcon
                        v-if="pauseJobsStore.is_paused"
                        class="w-4 text-warning"
                    />
                    <IconPause
                        v-else
                        class="w-4"
                    />
                </IconButton>
            </template>
        </ViewToolbar>

        <!-- Pause Banner -->
        <PauseBanner
            :paused="pauseJobsStore.is_paused"
            class="relative z-20"
        />

        <!-- New entries -->
        <button
            v-if="!inScreenWindow && jobStore.incomingCount > 0"
            @click="loadNewEntries"
            class="w-full shrink-0 text-[11px] text-primary px-3 py-1.5 flex items-center justify-center gap-1.5 hover:underline"
        >
            <ArrowPathIcon class="w-3 h-3" />
            <span>{{ $t('load_new_entries', { count: jobStore.incomingCount }) }}</span>
        </button>

        <!-- Content -->
        <div
            ref="listRef"
            class="flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
        >
            <div
                v-if="jobs.length > 0"
                class="pb-3"
            >
                <div ref="listTopRef"></div>
                <table
                    class="table w-full table-fixed"
                    data-row-list
                >
                    <thead class="ld-thead">
                        <tr>
                            <th
                                v-if="!isSplit"
                                class="w-16"
                            >
                                #
                            </th>
                            <th
                                @click="toggleSort('display_name')"
                                class="space-x-1.5 cursor-pointer w-auto"
                            >
                                <span>Job</span>
                                <span v-if="sortBy === 'display_name'">{{ sortDirection === 'asc' ? '▲' : '▼' }}</span>
                            </th>
                            <th
                                @click="toggleSort('duration')"
                                class="space-x-1.5 cursor-pointer text-right w-[100px]"
                            >
                                <span>Duration</span>
                                <span v-if="sortBy === 'duration'">{{ sortDirection === 'asc' ? '▲' : '▼' }}</span>
                            </th>
                            <th
                                v-if="!hideOriginColumn"
                                class="w-[190px] text-right"
                            >
                                {{ $t('origin') }}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <template
                            v-for="(jobsOnRelativeTime, timeKey) in groupedJobsByRelativeTime"
                            :key="timeKey"
                        >
                            <tr class="ld-group">
                                <td :colspan="columnCount">
                                    <button
                                        type="button"
                                        class="ld-group-label"
                                        :aria-expanded="!collapsedGroups[timeKey]"
                                        @click="toggleGroup(timeKey)"
                                    >
                                        {{ timeKey }}
                                        <ChevronDownIcon
                                            class="ld-group-chevron"
                                            :class="{ 'is-collapsed': collapsedGroups[timeKey] }"
                                        />
                                    </button>
                                </td>
                            </tr>
                            <template
                                v-for="job in jobsOnRelativeTime"
                                v-if="!collapsedGroups[timeKey]"
                                :key="job.job_id"
                            >
                                <tr
                                    :data-job-id="job.job_id"
                                    :data-row-id="job.job_id"
                                    tabindex="0"
                                    :aria-expanded="isOpen(job.job_id)"
                                    class="ld-row"
                                    :class="{
                                        'is-open': isOpen(job.job_id),
                                        'ld-job-focus': focusedJobId === job.job_id
                                    }"
                                    @click="toggle(job.job_id)"
                                    @keydown="onRowKeydown($event, job.job_id)"
                                >
                                    <td
                                        v-if="!isSplit"
                                        class="w-16 whitespace-nowrap"
                                    >
                                        <div class="flex items-center gap-1.5">
                                            <ArrowPathIcon
                                                v-if="job.status === 'Processing'"
                                                class="size-4 shrink-0 text-base-content/70 animate-spin [animation-duration:2s]"
                                                title="Processing"
                                            />
                                            <CheckIcon
                                                v-if="job.status === 'Processed'"
                                                class="size-4 shrink-0 text-success"
                                                title="Processed"
                                            />
                                            <XMarkIcon
                                                v-if="job.status === 'Failed'"
                                                class="size-4 shrink-0 text-error"
                                                title="Failed"
                                            />
                                            <InformationCircleIcon
                                                v-if="job.status === 'Queued'"
                                                class="size-4 shrink-0 text-warning"
                                                title="Queued"
                                            />
                                        </div>
                                    </td>
                                    <td>
                                        <div class="flex items-center justify-between gap-2 min-w-0">
                                            <span
                                                class="truncate min-w-0"
                                                :title="job.display_name"
                                                >{{ job.display_name }}</span
                                            >
                                            <span
                                                class="font-mono text-[11px] text-base-content/35 whitespace-nowrap shrink-0"
                                            >
                                                {{ dayjs(job.pushed_time ?? job.start_time).format('HH:mm:ss') }}
                                            </span>
                                        </div>
                                    </td>
                                    <td class="whitespace-nowrap text-right">
                                        {{ duration(job.start_time, job.end_time) }}
                                    </td>
                                    <td
                                        v-if="!hideOriginColumn"
                                        class="text-xs truncate text-right"
                                    >
                                        <div class="flex justify-end min-w-0">
                                            <DumpLink
                                                v-if="job.ide_handle.class_name !== 'empty'"
                                                :ide-handler="job.ide_handle"
                                                truncate
                                                middle-truncate
                                                :max-length="24"
                                                class="opacity-70 hover:opacity-100"
                                            />
                                            <span
                                                v-else
                                                class="opacity-40"
                                                >—</span
                                            >
                                        </div>
                                    </td>
                                </tr>
                                <tr
                                    v-if="isOpen(job.job_id)"
                                    class="ld-row-detail"
                                >
                                    <td
                                        :colspan="columnCount"
                                        class="max-w-0 whitespace-normal break-words"
                                    >
                                        <div class="space-y-3 py-1 px-1 min-w-0">
                                            <div
                                                v-if="jobStore.origin || horizonUrl"
                                                class="flex items-center gap-2"
                                            >
                                                <button
                                                    v-if="horizonUrl"
                                                    @click.stop="openInHorizon(job)"
                                                    class="btn btn-xs btn-soft gap-1 [-webkit-app-region:no-drag]"
                                                    title="Open job in Horizon"
                                                >
                                                    <IconHorizon class="w-3.5" />
                                                    Horizon
                                                </button>
                                                <button
                                                    v-if="jobStore.origin"
                                                    @click.stop="backToDump"
                                                    class="btn btn-xs btn-soft gap-1 [-webkit-app-region:no-drag] ml-auto"
                                                    title="Back to dump"
                                                >
                                                    ← Back to dump
                                                </button>
                                            </div>

                                            <div class="bg-base-100 border border-base-300 p-4 space-y-4">
                                                <div class="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3">
                                                    <div class="space-y-1 min-w-0">
                                                        <div
                                                            class="text-[10px] font-semibold uppercase tracking-wider text-base-content/40"
                                                        >
                                                            Job ID
                                                        </div>
                                                        <div class="font-mono text-xs break-all">{{ job.job_id }}</div>
                                                    </div>
                                                    <div class="space-y-1">
                                                        <div
                                                            class="text-[10px] font-semibold uppercase tracking-wider text-base-content/40"
                                                        >
                                                            Start
                                                        </div>
                                                        <div class="font-mono text-xs whitespace-nowrap">
                                                            {{
                                                                job.start_time
                                                                    ? dayjs(job.start_time).format('hh:mm:ss a')
                                                                    : '-'
                                                            }}
                                                        </div>
                                                    </div>
                                                    <div class="space-y-1">
                                                        <div
                                                            class="text-[10px] font-semibold uppercase tracking-wider text-base-content/40"
                                                        >
                                                            End
                                                        </div>
                                                        <div class="font-mono text-xs whitespace-nowrap">
                                                            {{
                                                                job.end_time
                                                                    ? dayjs(job.end_time).format('hh:mm:ss a')
                                                                    : '-'
                                                            }}
                                                        </div>
                                                    </div>
                                                    <div class="space-y-1">
                                                        <div
                                                            class="text-[10px] font-semibold uppercase tracking-wider text-base-content/40"
                                                        >
                                                            Duration
                                                        </div>
                                                        <div class="font-mono text-xs">
                                                            {{ duration(job.start_time, job.end_time) }}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div
                                                v-if="job.code_snippet && job.code_snippet.length > 0"
                                                class="bg-base-100 border-base-300 p-3 space-y-2 overflow-x-auto"
                                            >
                                                <span
                                                    v-if="job.exception_message"
                                                    class="block text-sm font-normal"
                                                    @click.stop="toggleMessageLimit"
                                                    :class="{ 'line-clamp-5': messageLimit }"
                                                    >{{ job.exception_message }}</span
                                                >
                                                <CodeSnippet
                                                    :code_snippet="job.code_snippet"
                                                    :ide_handle="job.ide_handle"
                                                />
                                            </div>

                                            <div class="bg-base-100 border border-base-300 p-4 overflow-x-auto">
                                                <div v-safe-html="job.job[0]"></div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            </template>
                        </template>
                    </tbody>
                </table>

                <div
                    v-if="hasMore"
                    class="py-3 flex justify-center"
                >
                    <button
                        @click="loadMore"
                        class="btn btn-ghost btn-xs text-base-content/70"
                    >
                        {{ $t('load_more', { count: jobs.length - visibleJobs.length }) }}
                    </button>
                </div>
                <div ref="listBottomRef"></div>
            </div>

            <div
                v-else
                class="flex items-center justify-center h-full min-h-[12rem] pointer-events-none"
            >
                <EmptyState screen="jobs" />
            </div>
        </div>
    </div>
</template>

<style scoped>
@reference "./../../styles.css";

:deep(.table tbody) {
    :where(th, td) {
        @apply p-1.5 px-2;
    }
}

@keyframes ld-job-focus-blink {
    0% {
        background-color: transparent;
    }
    30% {
        background-color: color-mix(in oklab, var(--color-primary) 18%, transparent);
    }
    100% {
        background-color: transparent;
    }
}

.ld-job-focus {
    animation: ld-job-focus-blink 1.6s ease-in-out 1;
}
</style>
