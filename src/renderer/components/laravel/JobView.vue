<script setup lang="ts">
import { Job, useJobStore } from "@/store/jobs";
import { computed, defineProps, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import moment from "moment";
import { PlayIcon, TrashIcon } from "@heroicons/vue/24/outline";
import { CheckIcon, XMarkIcon, ArrowPathIcon, InformationCircleIcon } from "@heroicons/vue/24/solid";

import { IdeHandle } from "@/types/IdeHandle";
import { useCurrentProject } from "@/store/current-project";
import { useSettingsStore } from "@/store/settings";
import SvgEmpty from "@/components/svg/SvgEmpty.vue";
import { usePauseJobsStore } from "@/store/pause-jobs";
import IconPause from "@/components/Icons/IconPause.vue";
import Divider from "@/components/common/Divider.vue";
import CodeSnippet from "@/components/CodeSnippet.vue";
import { useGlobalSearchStore } from "@/store/global-search";
import { FunnelIcon } from "@heroicons/vue/24/outline";
import { FunnelIcon as FunnelSolidIcon } from "@heroicons/vue/24/solid";

const jobStore = useJobStore();
const currentProjectStore = useCurrentProject();
const settingsStore = useSettingsStore();
const pauseJobsStore = usePauseJobsStore();
const globalSearchStore = useGlobalSearchStore();

const forceUpdate = ref(0);
const selected = ref();
const statusFilter = ref<string | null>(null);
const sortBy = ref<"display_name" | "duration" | "pushed_time">("pushed_time");
const sortDirection = ref<"asc" | "desc">("desc");
const collapsedGroups = ref<Record<string, boolean>>({});

const props = defineProps<{
    items: Record<string, Job>;
    inScreenWindow: boolean;
}>();

const toggleGroup = (timeKey: string) => {
    collapsedGroups.value[timeKey] = !collapsedGroups.value[timeKey];
};

const generateLink = (ideHandler: IdeHandle) => {
    const ide_handler = settingsStore.settings.ide_handler || "phpstorm://open?file={filepath}&line={line}";
    const { project_path, real_path, workdir, wsl_config, base_path, line } = ideHandler;

    const relativePath = real_path?.replace(workdir, "").replace(project_path, "");
    let linkPath = project_path + relativePath;

    if (base_path) {
        linkPath = linkPath.replace(base_path, currentProjectStore.value);
    }

    if (real_path) {
        let link = ide_handler.replace("{filepath}", linkPath).replace("{line}", line);
        if (ide_handler.includes("wsl_config") && wsl_config) {
            link = link.replace("{wsl_config}", wsl_config);
        }
        return link;
    }
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
            const matchesSearch = job.display_name.toLowerCase().includes(searchTerm) || job.job_id.includes(searchTerm) || job.job[0].includes(searchTerm);

            const matchesStatus = !statusFilter.value || job.status === statusFilter.value;

            return matchesSearch && matchesStatus;
        })
        .sort((a, b) => {
            const getValue = (job: Job) => {
                if (sortBy.value === "duration") {
                    const start = new Date(job.start_time ?? 0).getTime();
                    const end = new Date(job.end_time ?? 0).getTime();
                    return end - start;
                }
                if (sortBy.value === "display_name") {
                    return job.display_name.toLowerCase();
                }
                return new Date(job.pushed_time ?? 0).getTime();
            };

            const aVal = getValue(a);
            const bVal = getValue(b);

            if (aVal < bVal) return sortDirection.value === "asc" ? -1 : 1;
            if (aVal > bVal) return sortDirection.value === "asc" ? 1 : -1;
            return 0;
        });
});

const groupedJobsByRelativeTime = computed(() => {
    const groups: Record<string, Job[]> = {};

    for (const job of jobs.value) {
        const timeKey = moment(job.pushed_time ?? job.start_time).fromNow();
        if (!groups[timeKey]) {
            groups[timeKey] = [];
        }
        groups[timeKey].push(job);
    }

    return groups;
});

const toggleSort = (field: typeof sortBy.value) => {
    if (sortBy.value === field) {
        sortDirection.value = sortDirection.value === "asc" ? "desc" : "asc";

        return;
    }

    sortBy.value = field;
    sortDirection.value = "asc";
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
    if (e.key === "Escape") {
        const drawerToggle = document.getElementById("job-drawer") as HTMLInputElement;
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

    const sfDumpId = findJob.job[1];

    nextTick(() => {
        const sfDump = document.getElementById(`sf-dump-${sfDumpId}`);
        if (sfDump && !sfDump.hasAttribute("has-dump-js")) {
            sfDump.setAttribute("has-dump-js", "true");
            window.Sfdump(`sf-dump-${sfDumpId}`);
        }

        const toggle = document.getElementById("job-drawer") as HTMLInputElement;
        if (toggle) {
            toggle.checked = true;
        }
    });
};

const clear = () => {
    if (pauseJobsStore.is_paused) {
        pauseJobsStore.toggle();
    }

    selected.value = "";
    jobStore.jobs = {};
};

const duration = (startTime: any, endTime: any) => {
    if (!startTime || !endTime) return "-";

    const durationMs = new Date(endTime).getTime() - new Date(startTime).getTime();
    if (durationMs < 1000) return `${durationMs} ms`;

    return `${(durationMs / 1000).toFixed(2)} s`;
};

onMounted(() => {
    setInterval(() => {
        forceUpdate.value++;
        window.addEventListener("keydown", handleEscape);
    }, 60_000);
});

onBeforeUnmount(() => {
    window.removeEventListener("keydown", handleEscape);
});

const toggleMessageLimit = () => {
    if (selected.value) {
        selected.value.message_limit = !selected.value.message_limit;
    }
};
</script>

<template>
    <div class="px-3">
        <!-- Drawer for job details -->
        <div class="drawer drawer-end">
            <input
                id="job-drawer"
                type="checkbox"
                class="drawer-toggle hidden"
            />

            <div class="drawer-side z-[400]">
                <label
                    for="job-drawer"
                    class="drawer-overlay"
                ></label>
                <div class="menu bg-base-200 text-base-content min-h-full w-[calc(100vw-120px)] p-4">
                    <div
                        class="space-y-3"
                        v-if="selected"
                    >
                        <div class="flex justify-between nav-bar mb-0">
                            <h4 class="font-semibold">Job</h4>
                            <span>{{ selected.display_name }}</span>
                        </div>
                        <Divider />

                        <div class="tabs tabs-lift">
                            <input
                                v-if="selected.code_snippet && selected.code_snippet.length > 0"
                                checked="checked"
                                type="radio"
                                name="tab_jobs"
                                class="tab"
                                aria-label="Exception"
                            />
                            <div
                                v-if="selected.code_snippet && selected.code_snippet.length > 0"
                                class="relative tab-content bg-base-100 border-base-300 p-6"
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

                            <input
                                :checked="selected.code_snippet === null"
                                type="radio"
                                name="tab_jobs"
                                class="tab"
                                aria-label="Payload"
                            />
                            <div class="tab-content bg-base-100 border-base-300 p-6">
                                <div v-html="selected.html"></div>
                            </div>

                            <input
                                type="radio"
                                name="tab_jobs"
                                class="tab"
                                aria-label="Details"
                            />
                            <div class="tab-content bg-base-100 border-base-300 p-6">
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
                                            <td class="whitespace-nowrap">{{ selected.start_time ? moment(selected.start_time).format("hh:mm:ss a") : "-" }}</td>
                                            <td class="whitespace-nowrap">{{ selected.end_time ? moment(selected.end_time).format("hh:mm:ss a") : "-" }}</td>
                                            <td>{{ duration(selected.start_time, selected.end_time) }}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Header -->
        <div class="h-[calc(100vh-100px)]">
            <div class="flex items-center gap-1 justify-center">
                <Teleport to="#actions">
                    <div class="dropdown dropdown-bottom dropdown-end">
                        <button
                            tabindex="0"
                            role="button"
                            class="btn border border-base-content/5 btn-sm p-[0.5rem] btn-circle"
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
                            class="dropdown-content menu bg-base-300 rounded-box z-100 w-52 p-2 shadow-sm"
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
                        class="btn border border-base-content/5 btn-sm p-[0.5rem] btn-circle"
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
                        class="btn border border-base-content/5 btn-sm p-[0.5rem] btn-circle"
                        data-tippy-content="Clear"
                    >
                        <TrashIcon class="w-4" />
                    </button>
                </Teleport>
            </div>

            <div
                v-if="jobs.length > 0"
                class="overflow-auto"
                style="height: -webkit-fill-available"
            >
                <table class="table table-pin-rows table-zebra">
                    <thead>
                        <tr class="text-xs !bg-base-300 font-light text-base-content">
                            <th class="w-4">#</th>
                            <th
                                @click="toggleSort('display_name')"
                                class="space-x-1.5 cursor-pointer"
                            >
                                <span>Job</span>
                                <span v-if="sortBy === 'display_name'">{{ sortDirection === "asc" ? "▲" : "▼" }}</span>
                            </th>
                            <th
                                @click="toggleSort('duration')"
                                class="space-x-1.5 cursor-pointer text-right"
                            >
                                <span>Duration</span>
                                <span v-if="sortBy === 'duration'">{{ sortDirection === "asc" ? "▲" : "▼" }}</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <template
                            v-for="(jobsOnRelativeTime, timeKey) in groupedJobsByRelativeTime"
                            :key="timeKey"
                        >
                            <tr
                                class="bg-base-200 text-xs font-semibold text-center cursor-pointer"
                                @click="toggleGroup(timeKey)"
                            >
                                <td
                                    colspan="3"
                                    class="select-none hover:link"
                                >
                                    <span>{{ timeKey }}</span>
                                    <span class="ml-1.5">{{ collapsedGroups[timeKey] ? "▼" : "▲" }}</span>
                                </td>
                            </tr>
                            <tr
                                v-for="job in jobsOnRelativeTime"
                                v-if="!collapsedGroups[timeKey]"
                                :key="job.job_id"
                                @click="openModal(job.job_id)"
                                class="hover:bg-base-100 cursor-pointer"
                                :class="{
                                    'bg-base-300 hover:bg-neutral/70': selected && selected.id === job.job_id
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
                                <td class="whitespace-nowrap text-right">{{ duration(job.start_time, job.end_time) }}</td>
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

::v-deep(.table thead) {
    :where(th, td) {
        @apply p-2;
    }
}

::v-deep(.table tbody) {
    :where(th, td) {
        @apply p-1.5 px-2;
    }
}
</style>
