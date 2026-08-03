<script setup lang="ts">
import { Job, useJobStore } from '@/store/jobs';
import { useScreenStore } from '@/store/screen';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);
import { PlayIcon, TrashIcon } from '@heroicons/vue/24/outline';
import { CheckIcon, XMarkIcon, ArrowPathIcon, InformationCircleIcon } from '@heroicons/vue/24/solid';

import SvgEmpty from '@/components/svg/SvgEmpty.vue';
import { usePauseJobsStore } from '@/store/pause-jobs';
import IconPause from '@/components/Icons/IconPause.vue';
import Divider from '@/components/common/Divider.vue';
import CodeSnippet from '@/components/CodeSnippet.vue';
import { useGlobalSearchStore } from '@/store/global-search';
import { FunnelIcon } from '@heroicons/vue/24/outline';
import { FunnelIcon as FunnelSolidIcon } from '@heroicons/vue/24/solid';
import { generateLink } from '@/utils/ideHandler';
import { useCurrentProject } from '@/store/current-project';
import IconExternalLink from '@/components/Icons/IconExternalLink.vue';

const jobStore = useJobStore();
const screenStore = useScreenStore();
const pauseJobsStore = usePauseJobsStore();
const globalSearchStore = useGlobalSearchStore();
const currentProjectStore = useCurrentProject();

const forceUpdate = ref(0);
const selected = ref();
const focusedJobId = ref<string | null>(null);
const statusFilter = ref<string | null>(null);
const sortBy = ref<'display_name' | 'duration' | 'pushed_time'>('pushed_time');
const sortDirection = ref<'asc' | 'desc'>('desc');
const collapsedGroups = ref<Record<string, boolean>>({});
const horizonUrl = ref<string | null>(null);

const props = defineProps<{
    items: Record<string, Job>;
    inScreenWindow: boolean;
    hideHeader?: boolean;
}>();

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

const jobs = computed(() => {
    forceUpdate.value;

    const items = props.items || jobStore.jobs;

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

const groupedJobsByRelativeTime = computed(() => {
    const groups: Record<string, Job[]> = {};

    for (const job of jobs.value) {
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
    const items = props.items || jobStore.jobs;
    return Object.values(items).reduce(
        (acc, job) => {
            acc[job.status] = (acc[job.status] || 0) + 1;
            return acc;
        },
        {} as Record<string, number>
    );
});

const isFiltering = computed(() => !!statusFilter.value);

const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
        const drawerToggle = document.getElementById('job-drawer') as HTMLInputElement;
        if (drawerToggle) {
            drawerToggle.checked = false;
        }
    }
};

const openModal = (id: string) => {
    const findJob = jobs.value.find((job) => job.job_id === id);
    if (!findJob) return;

    selected.value = {
        id: findJob.job_id,
        html: findJob.job[0],
        display_name: findJob.display_name,
        start_time: findJob.start_time,
        end_time: findJob.end_time,
        status: findJob.status,
        code_snippet: findJob.code_snippet ?? null,
        message_limit: true,
        exception_message: findJob.exception_message,
        ide_handle: findJob.ide_handle,
        created_at: findJob.pushed_time
    };

    fetchAppUrl();

    const sfDumpId = findJob.job[1];

    nextTick(() => {
        const sfDump = document.getElementById(`sf-dump-${sfDumpId}`);
        if (sfDump && !sfDump.hasAttribute('has-dump-js')) {
            sfDump.setAttribute('has-dump-js', 'true');
            window.Sfdump(`sf-dump-${sfDumpId}`);
        }

        const toggle = document.getElementById('job-drawer') as HTMLInputElement;
        if (toggle) {
            toggle.checked = true;
        }
    });
};

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

const openInHorizon = () => {
    if (!horizonUrl.value || !selected.value) return;

    const segment = statusToHorizonSegment(selected.value.status);
    const url = `${horizonUrl.value.replace(/\/$/, '')}/horizon/jobs/${segment}/${selected.value.id}`;
    window.ipcRenderer.send('main:openLink', url);
};

const focusJob = async (id: string) => {
    statusFilter.value = null;
    collapsedGroups.value = {};

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

    openModal(id);
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

    const drawer = document.getElementById('job-drawer') as HTMLInputElement;
    if (drawer) {
        drawer.checked = false;
    }

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

    selected.value = '';
    jobStore.jobs = {};
};

const duration = (startTime: any, endTime: any) => {
    if (!startTime || !endTime) return '-';

    const durationMs = new Date(endTime).getTime() - new Date(startTime).getTime();
    if (durationMs < 1000) return `${durationMs} ms`;

    return `${(durationMs / 1000).toFixed(2)} s`;
};

onMounted(() => {
    if (jobStore.focusJobId) {
        focusJob(jobStore.focusJobId);
    }

    setInterval(() => {
        forceUpdate.value++;
        window.addEventListener('keydown', handleEscape);
    }, 60_000);
});

onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleEscape);
});

const toggleMessageLimit = () => {
    if (selected.value) {
        selected.value.message_limit = !selected.value.message_limit;
    }
};
</script>

<template>
    <div>
        <!-- Drawer for job details -->
        <div class="drawer drawer-end">
            <input
                id="job-drawer"
                type="checkbox"
                class="drawer-toggle hidden"
            />

            <div class="drawer-side z-400">
                <label
                    for="job-drawer"
                    class="drawer-overlay"
                ></label>
                <div class="menu bg-base-200 text-base-content min-h-full w-[calc(100vw-120px)] p-4">
                    <div
                        class="space-y-3"
                        v-if="selected"
                    >
                        <div class="flex justify-between items-center nav-bar mb-0">
                            <div class="flex items-center gap-2">
                                <button
                                    v-if="jobStore.origin"
                                    @click="backToDump"
                                    class="btn btn-xs btn-ghost gap-1 [-webkit-app-region:no-drag]"
                                    title="Back to dump"
                                >
                                    ← Back to dump
                                </button>
                                <h4 class="font-semibold">Job</h4>
                            </div>
                            <div class="flex items-center gap-2">
                                <button
                                    v-if="horizonUrl"
                                    @click="openInHorizon"
                                    class="btn btn-xs btn-ghost gap-1 [-webkit-app-region:no-drag]"
                                    title="Open job in Horizon"
                                >
                                    <IconExternalLink class="w-3.5" />
                                    Horizon
                                </button>
                                <span>{{ selected.display_name }}</span>
                            </div>
                        </div>
                        <Divider />

                        <div
                            v-if="selected.code_snippet && selected.code_snippet.length > 0"
                            class="relative bg-base-100 border-base-300 p-3"
                        >
                            <div class="w-[calc(100vw-200px)] space-y-2">
                                <span
                                    v-if="selected.exception_message"
                                    class="text-sm font-normal"
                                    @click="toggleMessageLimit"
                                    :class="{
                                        'line-clamp-5': selected.message_limit
                                    }"
                                    >{{ selected.exception_message }}</span
                                >
                                <CodeSnippet
                                    :code_snippet="selected.code_snippet"
                                    :ide_handle="selected.ide_handle"
                                />
                            </div>
                        </div>

                        <div class="bg-base-100 border-base-300 p-3">
                            <table class="table">
                                <thead>
                                    <tr class="text-base-content bg-base-100">
                                        <td>Job ID</td>
                                        <td>Start Time</td>
                                        <td>End Time</td>
                                        <td>Duration</td>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>{{ selected.id }}</td>
                                        <td class="whitespace-nowrap">
                                            {{
                                                selected.start_time
                                                    ? dayjs(selected.start_time).format('hh:mm:ss a')
                                                    : '-'
                                            }}
                                        </td>
                                        <td class="whitespace-nowrap">
                                            {{
                                                selected.end_time ? dayjs(selected.end_time).format('hh:mm:ss a') : '-'
                                            }}
                                        </td>
                                        <td>{{ duration(selected.start_time, selected.end_time) }}</td>
                                    </tr>
                                </tbody>
                            </table>
                            <Divider class="my-4" />
                            <div v-html="selected.html"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Actions Bar -->
        <div
            v-if="!hideHeader"
            class="flex items-center justify-between w-full h-9 px-3"
        >
            <!-- Left: title -->
            <span class="text-[10px] font-bold uppercase tracking-widest text-base-content/70 select-none">Jobs</span>

            <!-- Right: actions -->
            <div class="flex items-center gap-1">
                <div class="dropdown dropdown-bottom dropdown-end">
                    <button
                        tabindex="0"
                        role="button"
                        class="btn btn-ghost btn-circle btn-sm"
                        data-tippy-content="Filter Status"
                    >
                        <FunnelIcon
                            v-if="!isFiltering"
                            class="w-4"
                        />
                        <FunnelSolidIcon
                            v-else
                            class="w-4 text-primary"
                        />
                    </button>

                    <ul
                        tabindex="0"
                        class="p-2 shadow-xl dropdown-content menu bg-base-200/95 backdrop-blur-xl rounded-xl border border-white/5 z-[100] w-52"
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

                <button
                    @click="pauseJobsStore.toggle()"
                    class="btn btn-ghost btn-circle btn-sm"
                    :data-tippy-content="$t('pause')"
                >
                    <PlayIcon
                        v-if="pauseJobsStore.is_paused"
                        class="w-4 text-warning"
                    />
                    <IconPause
                        v-else
                        class="w-4"
                    />
                </button>
                <button
                    v-if="jobs.length > 0"
                    @click="clear"
                    class="btn btn-ghost btn-circle btn-sm text-error/70 hover:text-error"
                    data-tippy-content="Clear"
                >
                    <TrashIcon class="w-4" />
                </button>
            </div>
        </div>

        <!-- Content -->
        <div :class="inScreenWindow ? 'h-[calc(100vh-100px)]' : 'h-[calc(100vh-140px)]'">
            <div
                v-if="jobs.length > 0"
                class="overflow-y-auto overflow-x-hidden px-3"
                style="height: -webkit-fill-available"
            >
                <table class="table table-pin-rows table-zebra">
                    <thead>
                        <tr class="text-xs bg-base-300! font-light text-base-content">
                            <th class="w-4">#</th>
                            <th
                                @click="toggleSort('display_name')"
                                class="space-x-1.5 cursor-pointer"
                            >
                                <span>Job</span>
                                <span v-if="sortBy === 'display_name'">{{ sortDirection === 'asc' ? '▲' : '▼' }}</span>
                            </th>
                            <th
                                @click="toggleSort('duration')"
                                class="space-x-1.5 cursor-pointer text-right"
                            >
                                <span>Duration</span>
                                <span v-if="sortBy === 'duration'">{{ sortDirection === 'asc' ? '▲' : '▼' }}</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <template
                            v-for="(jobsOnRelativeTime, timeKey) in groupedJobsByRelativeTime"
                            :key="timeKey"
                        >
                            <tr class="bg-base-200 text-xs font-semibold text-center">
                                <td
                                    colspan="3"
                                    class="select-none"
                                >
                                    <span
                                        class="cursor-pointer link"
                                        @click="toggleGroup(timeKey)"
                                    >
                                        {{ timeKey }}
                                        <span class="ml-1">{{ collapsedGroups[timeKey] ? '▼' : '▲' }}</span>
                                    </span>
                                </td>
                            </tr>
                            <tr
                                v-for="job in jobsOnRelativeTime"
                                v-if="!collapsedGroups[timeKey]"
                                :key="job.job_id"
                                :data-job-id="job.job_id"
                                @click="openModal(job.job_id)"
                                class="hover:bg-base-100 cursor-pointer"
                                :class="{
                                    'bg-base-300 hover:bg-neutral/70': selected && selected.id === job.job_id,
                                    'ld-job-focus': focusedJobId === job.job_id
                                }"
                            >
                                <td>
                                    <div class="flex items-center justify-center">
                                        <ArrowPathIcon
                                            v-if="job.status === 'Processing'"
                                            class="w-6 text-primary"
                                            title="Processing"
                                        />
                                        <CheckIcon
                                            v-if="job.status === 'Processed'"
                                            class="w-6 text-success"
                                            title="Processed"
                                        />
                                        <XMarkIcon
                                            v-if="job.status === 'Failed'"
                                            class="w-6 text-error"
                                            title="Failed"
                                        />
                                        <InformationCircleIcon
                                            v-if="job.status === 'Queued'"
                                            class="w-6 text-warning"
                                            title="Queued"
                                        />
                                    </div>
                                </td>
                                <td class="break-all">
                                    <div>{{ job.display_name }}</div>
                                    <a
                                        v-if="job.ide_handle.class_name !== 'empty'"
                                        :href="generateLink(job.ide_handle)"
                                        class="link text-xs link-hover opacity-60"
                                    >
                                        {{ job.ide_handle.class_name }}:{{ job.ide_handle.line }}
                                    </a>
                                </td>
                                <td class="whitespace-nowrap text-right">
                                    {{ duration(job.start_time, job.end_time) }}
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
