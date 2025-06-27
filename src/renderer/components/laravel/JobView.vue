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

const jobStore = useJobStore();
const currentProjectStore = useCurrentProject();
const settingsStore = useSettingsStore();
const pauseJobsStore = usePauseJobsStore();
const globalSearchStore = useGlobalSearchStore();

const selected = ref();
const statusFilter = ref<string | null>(null);
const sortBy = ref<"display_name" | "duration" | "pushed_time">("pushed_time");
const sortDirection = ref<"asc" | "desc">("desc");

const props = defineProps<{
    items: Record<string, Job>;
    inScreenWindow: boolean;
}>();

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

const jobs = computed(() => {
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

const toggleSort = (field: typeof sortBy.value) => {
    if (sortBy.value === field) {
        sortDirection.value = sortDirection.value === "asc" ? "desc" : "asc";
    } else {
        sortBy.value = field;
        sortDirection.value = "asc";
    }
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
        ide_handle: findJob.ide_handle
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
    window.addEventListener("keydown", handleEscape);
});

onBeforeUnmount(() => {
    window.removeEventListener("keydown", handleEscape);
});
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
                        <div>
                            <div class="nav-bar flex justify-between">
                                <span class="text-base font-semibold">Job</span>

                                <span
                                    v-if="selected.status === 'Processing'"
                                    class="badge badge-sm text-primary-content bg-primary"
                                    >Processing</span
                                >
                                <span
                                    v-if="selected.status === 'Processed'"
                                    class="badge badge-sm text-success-content bg-success"
                                    >Processed</span
                                >
                                <span
                                    v-if="selected.status === 'Failed'"
                                    class="badge badge-sm text-error-content bg-error"
                                    >Failed</span
                                >
                                <span
                                    v-if="selected.status === 'Queued'"
                                    class="badge badge-sm text-warning-content bg-warning"
                                    >Queued</span
                                >
                            </div>
                            <span class="text-sm">{{ selected.display_name }}</span>
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
                                class="tab-content bg-base-100 border-base-300 p-6"
                            >
                                <CodeSnippet
                                    :code_snippet="selected.code_snippet"
                                    :ide_handle="selected.ide_handle"
                                />
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
        <div
            class="space-y-2"
            :class="{ 'h-[calc(100vh-100px)]': inScreenWindow, 'h-[calc(100vh-150px)]': !inScreenWindow }"
        >
            <div class="flex items-center gap-1 justify-center">
                <div class="flex items-center gap-2 text-xs bg-base-300 shadow border border-base-content/10 rounded-box py-1.5 px-2 h-[34px]">
                    <span class="flex gap-1.5 text-xs">
                        <FunnelIcon class="w-4" />
                        {{ isFiltering ? "Filtering" : "Filter" }}
                    </span>
                    <form class="filter text-xs items-center">
                        <input
                            class="btn btn-xs btn-square"
                            id="filter-by-status"
                            type="reset"
                            value="×"
                            @click.prevent="statusFilter = null"
                        />
                        <div>
                            <input
                                :class="{
                                    'text-warning': statusFilter == 'Queued'
                                }"
                                class="btn btn-xs font-normal"
                                type="radio"
                                id="filter-queued"
                                name="status"
                                value="Queued"
                                v-model="statusFilter"
                                :aria-label="`Queued (${statusCounts.Queued || 0})`"
                            />
                        </div>
                        <div>
                            <input
                                :class="{
                                    'text-success': statusFilter == 'Processed'
                                }"
                                class="btn btn-xs font-normal"
                                type="radio"
                                id="filter-processed"
                                name="status"
                                value="Processed"
                                v-model="statusFilter"
                                :aria-label="`Processed (${statusCounts.Processed || 0})`"
                            />
                        </div>
                        <div>
                            <input
                                :class="{
                                    'text-error': statusFilter == 'Failed'
                                }"
                                class="btn btn-xs font-normal"
                                type="radio"
                                id="filter-failed"
                                name="status"
                                value="Failed"
                                v-model="statusFilter"
                                :aria-label="`Failed (${statusCounts.Failed || 0})`"
                            />
                        </div>
                    </form>
                </div>
                <Teleport to="#dumps-actions">
                    <button
                        @click="pauseJobsStore.toggle()"
                        class="btn btn-sm p-[0.5rem]"
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
                        @click="clear"
                        class="btn btn-sm p-[0.5rem]"
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
                            <th
                                @click="toggleSort('pushed_time')"
                                class="space-x-1.5 cursor-pointer"
                            >
                                <span>Date</span>
                                <span v-if="sortBy === 'pushed_time'">{{ sortDirection === "asc" ? "▲" : "▼" }}</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for="job in jobs"
                            :key="job.job_id"
                            @click="openModal(job.job_id)"
                            class="hover:bg-base-100 cursor-pointer"
                            :class="{
                                'bg-neutral text-neutral-content hover:bg-neutral/70': selected && selected.id === job.job_id
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
                            <td class="w-[120px] whitespace-nowrap">
                                <div class="flex flex-col">
                                    <span>{{ moment(job.pushed_time ?? job.start_time).fromNow() }}</span>
                                    <span class="opacity-65 text-xs">{{ moment(job.pushed_time ?? job.start_time).format("HH:mm:ss") }}</span>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div
                v-else
                class="-ml-8 absolute flex items-center justify-center w-full"
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

::v-deep(.table) {
    :where(th, td) {
        @apply p-1.5 px-2;
    }
}
</style>
