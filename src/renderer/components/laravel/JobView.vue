<script setup lang="ts">
import { Job, useJobStore } from "@/store/jobs";
import { computed, defineProps, nextTick, ref } from "vue";
import moment from "moment";
import { EyeIcon, MagnifyingGlassIcon } from "@heroicons/vue/24/outline";
import { CheckIcon, XMarkIcon, ArrowPathIcon, InformationCircleIcon } from "@heroicons/vue/24/solid";
import { TrashIcon } from "@heroicons/vue/24/outline";

import { IdeHandle } from "@/types/IdeHandle";
import { useCurrentProject } from "@/store/current-project";
import { useSettingsStore } from "@/store/settings";
import SvgEmpty from "@/components/Svg/SvgEmpty.vue";

const jobStore = useJobStore();
const currentProjectStore = useCurrentProject();
const settingsStore = useSettingsStore();

const selectedJobDetail = ref();
const search = ref("");

const props = defineProps<{
    items: Record<string, Job>;
    inScreenWindow: boolean;
}>();

const generateLink = (ideHandler: IdeHandle) => {
    const ide_handler = settingsStore.settings.ide_handler ? settingsStore.settings.ide_handler : "phpstorm://open?file={filepath}&line={line}";

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
    const items = props.items ? props.items : jobStore.jobs;

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

const openModal = (id: string) => {
    const findJob = jobs.value.find((job) => job.job_id === id);

    selectedJobDetail.value = {
        id: findJob?.job_id,
        html: findJob?.job[0],
        display_name: findJob?.display_name,
        start_time: findJob?.start_time,
        end_time: findJob?.end_time
    };

    const sfDumpId = findJob?.job[1];

    nextTick(() => {
        const sfDump = document.getElementById(`sf-dump-${sfDumpId}`);

        if (!sfDump?.hasAttribute("has-dump-js")) {
            sfDump?.setAttribute("has-dump-js", "true");
            window.Sfdump(`sf-dump-${sfDumpId}`);
        }

        modal.showModal();
    });
};

const clear = () => {
    selectedJobDetail.value = "";
    jobStore.jobs = {};
};

const duration = (startTime: any, endTime: any) => {
    if (!startTime || !endTime) {
        return "-";
    }

    startTime = new Date(startTime);
    endTime = new Date(endTime);

    const jobStartTime = new Date(startTime);
    const durationMs = endTime.getTime() - jobStartTime.getTime();

    if (durationMs < 1000) {
        return `${durationMs} ms`;
    }

    const durationSeconds = (durationMs / 1000).toFixed(2);
    return `${durationSeconds} s`;
};
</script>

<template>
    <div class="px-3">
        <dialog
            id="modal"
            class="modal"
            v-if="selectedJobDetail"
        >
            <div class="modal-box max-w-2xl">
                <h3
                    class="text-lg font-bold"
                    v-text="selectedJobDetail.display_name"
                ></h3>
                <div class="py-4 space-y-2">
                    <div v-html="selectedJobDetail.html"></div>
                    <table class="table table-zebra">
                        <thead>
                            <tr>
                                <td class="bg-base-200">Job ID</td>
                                <td>Start Time</td>
                                <td>End Time</td>
                                <td>Duration</td>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td class="bg-base-200">{{ selectedJobDetail.id }}</td>
                                <td>{{ moment(selectedJobDetail.start_time).format("hh:mm:ss a") }}</td>
                                <td>{{ moment(selectedJobDetail.end_time).format("hh:mm:ss a") }}</td>
                                <td>{{ duration(selectedJobDetail.start_time, selectedJobDetail.end_time) }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            <form
                method="dialog"
                class="modal-backdrop"
            >
                <button>close</button>
            </form>
        </dialog>

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
                    @click="clear()"
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
                            <th>Duration</th>
                            <th>Date</th>
                            <th class="w-6"></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for="job in jobs"
                            :key="job.job_id"
                        >
                            <td>
                                <div class="flex items-center justify-center">
                                    <ArrowPathIcon
                                        class="w-6 text-primary"
                                        v-if="job.status === 'Processing'"
                                    />
                                    <CheckIcon
                                        class="w-6 text-success"
                                        v-if="job.status === 'Processed'"
                                    />
                                    <XMarkIcon
                                        class="w-6 text-error"
                                        v-if="job.status === 'Failed'"
                                    />
                                    <InformationCircleIcon
                                        class="w-6 text-warning"
                                        v-if="job.status === 'Queued'"
                                    />
                                </div>
                            </td>
                            <td class="break-all">
                                <div>{{ job.display_name }}</div>
                                <a
                                    v-if="job.ide_handle.class_name !== 'empty'"
                                    :href="generateLink(job.ide_handle)"
                                    v-text="`${job.ide_handle.class_name}:${job.ide_handle.line}`"
                                    class="link text-xs opacity-60"
                                >
                                </a>
                            </td>
                            <td class="whitespace-nowrap text-right">{{ duration(job.start_time, job.end_time) }}</td>
                            <td class="w-[120px] whitespace-nowrap">
                                <div class="flex flex-col">
                                    <span>{{ moment(job.pushed_time ?? job.start_time).fromNow() }}</span>
                                    <span class="opacity-65 text-xs">{{ moment(job.pushed_time ?? job.start_time).format("HH:mm:ss") }}</span>
                                </div>
                            </td>
                            <td class="w-[64px] ma-w-[64px]">
                                <button @click="openModal(job.job_id)">
                                    <EyeIcon class="w-5 text-primary" />
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div
                v-else
                class="-ml-8 -mt-14 absolute flex items-center justify-center w-full"
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
