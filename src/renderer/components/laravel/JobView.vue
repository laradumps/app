<script setup lang="ts">
import { Job, useJobStore } from "@/store/jobs";
import { computed, defineProps, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import moment from "moment";
import { MagnifyingGlassIcon, PlayIcon } from "@heroicons/vue/24/outline";
import { CheckIcon, XMarkIcon, ArrowPathIcon, InformationCircleIcon, TrashIcon } from "@heroicons/vue/24/solid";

import { IdeHandle } from "@/types/IdeHandle";
import { useCurrentProject } from "@/store/current-project";
import { useSettingsStore } from "@/store/settings";
import SvgEmpty from "@/components/svg/SvgEmpty.vue";
import { usePauseJobsStore } from "@/store/pause-jobs";
import IconPause from "@/components/Icons/IconPause.vue";

const jobStore = useJobStore();
const currentProjectStore = useCurrentProject();
const settingsStore = useSettingsStore();
const pauseJobsStore = usePauseJobsStore();

const selectedJobDetail = ref();
const search = ref("");

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
            const searchTerm = search.value.toLowerCase();
            return job.display_name.toLowerCase().includes(searchTerm) || job.job_id.includes(searchTerm) || job.job[0].includes(searchTerm);
        })
        .sort((a, b) => {
            const dateA = a.pushed_time ? new Date(a.pushed_time).getTime() : 0;
            const dateB = b.pushed_time ? new Date(b.pushed_time).getTime() : 0;
            return dateB - dateA;
        });
});

const handleEscape = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
        const drawerToggle = document.getElementById("my-drawer") as HTMLInputElement;
        if (drawerToggle) {
            drawerToggle.checked = false;
        }
    }
};

const openModal = (id: string) => {
    const findJob = jobs.value.find((job) => job.job_id === id);
    if (!findJob) return;

    selectedJobDetail.value = {
        id: findJob.job_id,
        html: findJob.job[0],
        display_name: findJob.display_name,
        start_time: findJob.start_time,
        end_time: findJob.end_time
    };

    const sfDumpId = findJob.job[1];

    nextTick(() => {
        const sfDump = document.getElementById(`sf-dump-${sfDumpId}`);
        if (sfDump && !sfDump.hasAttribute("has-dump-js")) {
            sfDump.setAttribute("has-dump-js", "true");
            window.Sfdump(`sf-dump-${sfDumpId}`);
        }

        const toggle = document.getElementById("my-drawer") as HTMLInputElement;
        if (toggle) {
            toggle.checked = true;
        }
    });
};

const clear = () => {
    selectedJobDetail.value = "";
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
        <div class="drawer drawer-end">
            <input
                id="my-drawer"
                type="checkbox"
                class="drawer-toggle hidden"
            />

            <div class="drawer-side">
                <label
                    for="my-drawer"
                    class="drawer-overlay"
                ></label>
                <div class="menu bg-base-200 text-base-content min-h-full w-[calc(100vw-120px)] p-4">
                    <div v-if="selectedJobDetail">
                        <h3 class="nav-bar text-base font-bold">{{ selectedJobDetail.display_name }}</h3>
                        <div class="py-4 space-y-5">
                            <table class="table table-zebra">
                                <thead>
                                    <tr>
                                        <td>Job ID</td>
                                        <td>Start Time</td>
                                        <td>End Time</td>
                                        <td>Duration</td>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>{{ selectedJobDetail.id }}</td>
                                        <td class="whitespace-nowrap">{{ moment(selectedJobDetail.start_time).format("hh:mm:ss a") }}</td>
                                        <td class="whitespace-nowrap">{{ moment(selectedJobDetail.end_time).format("hh:mm:ss a") }}</td>
                                        <td>{{ duration(selectedJobDetail.start_time, selectedJobDetail.end_time) }}</td>
                                    </tr>
                                </tbody>
                            </table>
                            <div v-html="selectedJobDetail.html"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div
            class="space-y-3"
            :class="{ 'h-[calc(100vh-100px)]': inScreenWindow, 'h-[calc(100vh-150px)]': !inScreenWindow }"
        >
            <div class="flex items-center gap-1 justify-between mt-1">
                <label class="input w-full input-sm">
                    <MagnifyingGlassIcon class="size-4" />
                    <input
                        v-model="search"
                        type="search"
                        class="grow"
                        :placeholder="$t('search')"
                    />
                </label>
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
            </div>

            <div
                v-if="jobs.length > 0"
                class="overflow-auto"
                style="height: -webkit-fill-available"
            >
                <table class="table table-zebra">
                    <thead>
                        <tr>
                            <th class="w-4">#</th>
                            <th>Job</th>
                            <th class="text-right">Duration</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for="job in jobs"
                            :key="job.job_id"
                            @click="openModal(job.job_id)"
                            class="hover:bg-base-100 cursor-pointer"
                        >
                            <td>
                                <div class="flex items-center justify-center">
                                    <ArrowPathIcon
                                        v-if="job.status === 'Processing'"
                                        class="w-6 text-primary"
                                    />
                                    <CheckIcon
                                        v-if="job.status === 'Processed'"
                                        class="w-6 text-success"
                                    />
                                    <XMarkIcon
                                        v-if="job.status === 'Failed'"
                                        class="w-6 text-error"
                                    />
                                    <InformationCircleIcon
                                        v-if="job.status === 'Queued'"
                                        class="w-6 text-warning"
                                    />
                                </div>
                            </td>
                            <td class="break-all">
                                <div>{{ job.display_name }}</div>
                                <a
                                    v-if="job.ide_handle.class_name !== 'empty'"
                                    :href="generateLink(job.ide_handle)"
                                    class="link text-xs opacity-60"
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
                    <h1 class="text-lg font-semibold mb-2">No Jobs</h1>
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
