<script setup lang="ts">
import { Job, useJobStore } from "@/store/jobs";
import { computed, defineProps, nextTick, onMounted, ref } from "vue";
import moment from "moment";
import { EyeIcon } from "@heroicons/vue/24/outline";
import { CheckIcon, XMarkIcon, ArrowPathIcon, InformationCircleIcon } from "@heroicons/vue/24/solid";
import { TrashIcon } from "@heroicons/vue/24/outline";

import tippy from "tippy.js";
import "tippy.js/dist/tippy.css";
import { useIDEHandlerStore } from "@/store/ide-handler";
import { IdeHandle } from "@/types/IdeHandle";
import { useCurrentProject } from "@/store/current-project";

const jobStore = useJobStore();
const IDEHandlerStore = useIDEHandlerStore();
const currentProjectStore = useCurrentProject();

const selectedJobDetail = ref();
const search = ref("");

const props = defineProps<{
    items: Record<string, Job>;
}>();

const generateLink = (ideHandler: IdeHandle) => {
    const { project_path, real_path, workdir, wsl_config, base_path, line } = ideHandler;
    const relativePath = real_path?.replace(workdir, "").replace(project_path, "");
    let linkPath = project_path + relativePath;

    if (base_path) {
        linkPath = linkPath.replace(base_path, currentProjectStore.value);
    }

    if (real_path) {
        let link = IDEHandlerStore.value.replace("{filepath}", linkPath).replace("{line}", line);
        if (IDEHandlerStore.value.includes("wsl_config") && wsl_config) {
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

onMounted(() => {
    nextTick(() => tippy("[data-tippy-content]", { placement: "right-end" }));
});
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
                        <tr>
                            <td class="bg-base-200">Job ID</td>
                            <td>{{ selectedJobDetail.id }}</td>
                        </tr>
                        <tr>
                            <td class="bg-base-200">Start Time</td>
                            <td>{{ moment(selectedJobDetail.start_time).format("hh:mm:ss a") }}</td>
                        </tr>
                        <tr>
                            <td class="bg-base-200">End Time</td>
                            <td>{{ moment(selectedJobDetail.end_time).format("hh:mm:ss a") }}</td>
                        </tr>
                        <tr>
                            <td class="bg-base-200">Duration</td>
                            <td>{{ duration(selectedJobDetail.start_time, selectedJobDetail.end_time) }}</td>
                        </tr>
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

        <div class="space-y-3 h-[calc(100vh-140px)]">
            <div class="flex items-center gap-2 justify-between mt-1">
                <input
                    v-model="search"
                    type="text"
                    class="w-full input input-sm"
                    :placeholder="$t('search')"
                />
                <button
                    @click="clear()"
                    class="btn btn-ghost btn-sm"
                >
                    <TrashIcon class="w-4" />
                    <span class="text-xs">{{ $t("clear") }}</span>
                </button>
            </div>

            <div
                v-if="jobs.length === 0"
                class="flex items-center justify-center w-full h-full"
                style="height: -webkit-fill-available"
            >
                <span class="text-sm uppercase">No jobs</span>
            </div>

            <table
                v-else
                class="table table-zebra"
            >
                <thead>
                    <tr class="bg-base-200">
                        <th class="w-4">Status</th>
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
                        <td :data-tippy-content="job.status">
                            <CheckIcon
                                class="w-5 text-success"
                                v-if="job.status === 'Processed'"
                            />
                            <XMarkIcon
                                class="w-5 text-error"
                                v-if="job.status === 'Failed'"
                            />
                            <ArrowPathIcon
                                class="w-5 text-info"
                                v-if="job.status === 'Processing'"
                            />
                            <InformationCircleIcon
                                class="w-5 text-warning"
                                v-if="job.status === 'Queued'"
                            />
                        </td>
                        <td class="break-all">
                            <div>{{ job.display_name }}</div>
                            <a
                                :href="generateLink(job.ide_handle)"
                                v-text="`${job.ide_handle.class_name}:${job.ide_handle.line}`"
                                class="link text-xs opacity-60"
                            >
                            </a>
                        </td>
                        <td class="whitespace-nowrap">{{ duration(job.start_time, job.end_time) }}</td>
                        <td class="w-[120px] whitespace-nowrap">
                            {{ moment(job.pushed_time ?? job.start_time).format("hh:mm:ss a") }}
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
    </div>
</template>
