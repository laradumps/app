<script setup lang="ts">
import { useJobStore } from "@/store/jobs";
import { computed, nextTick, ref } from "vue";
import moment from "moment";
import { EyeIcon } from "@heroicons/vue/24/outline";
import { CheckIcon, XMarkIcon, ArrowPathIcon, InformationCircleIcon } from "@heroicons/vue/24/solid";

const jobStore = useJobStore();

const selectedJobDetail = ref();
const search = ref("");

const jobs = computed(() => {
    return Object.values(jobStore.jobs)
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
        return "N/A";
    }

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
    <div class="px-3 space-y-3">
        <dialog
            id="modal"
            class="modal"
            v-if="selectedJobDetail"
        >
            <div class="modal-box">
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

        <div class="flex items-center gap-2">
            <input
                v-model="search"
                type="text"
                class="grow input-sm rounded-md font-normal font-sans p-2"
                :placeholder="$t('search')"
            />
            <button
                @click="clear()"
                class="btn btn-error btn-outline btn-xs"
            >
                {{ $t("clear") }}
            </button>
        </div>

        <table class="table table-zebra">
            <thead>
                <tr class="bg-base-200">
                    <th>Status</th>
                    <th>Job</th>
                    <th>Duration</th>
                    <th>Date</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                <tr
                    v-for="job in jobs"
                    :key="job.job_id"
                >
                    <td class="flex justify-center">
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
                    <td class="break-all">{{ job.display_name }}</td>
                    <td class="whitespace-nowrap">{{ duration(job.start_time, job.end_time) }}</td>
                    <td class="w-[120px] whitespace-nowrap">
                        {{ job?.start_time ? moment(job?.start_time).format("hh:mm:ss a") : "N/A" }}
                    </td>
                    <td class="w-[64px] ma-w-[64px] flex items-center">
                        <button @click="openModal(job.job_id)">
                            <EyeIcon class="w-5 text-primary" />
                        </button>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</template>
