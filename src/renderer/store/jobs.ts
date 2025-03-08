import { defineStore } from "pinia";
import { JobPayload } from "@/types/Payload";
import { IdeHandle } from "@/types/IdeHandle";
import { useSettingsStore } from "@/store/settings";

export type Job = {
    job_id: string;
    status: string;
    duration: string;
    job: any;
    pushed_time: Date;
    start_time: Date | null;
    end_time: Date | null;
    display_name: string;
    ide_handle: IdeHandle;
};

type State = {
    jobs: Record<string, Job>;
};

export const useJobStore = defineStore("jobStore", {
    state: (): State => ({
        jobs: {}
    }),
    actions: {
        addOrUpdateJob(jobs: JobPayload, ide_handle: IdeHandle) {
            this._removeOldestIfExceedsLimit();

            if (!this.jobs[jobs.job_id]) {
                this._initializeJob(jobs, ide_handle);
            }

            if (this.jobs[jobs.job_id]) {
                this.jobs[jobs.job_id].status = this.jobs[jobs.job_id].status !== "Failed" ? jobs.status : "Failed";

                if (jobs.status === "Processing") {
                    this.jobs[jobs.job_id].start_time = new Date();
                }

                if (["Processed", "Failed"].includes(jobs.status)) {
                    this.jobs[jobs.job_id].end_time = new Date();
                }
            }
        },
        _initializeJob(jobs: JobPayload, ide_handle: IdeHandle) {
            this.jobs[jobs.job_id] = {
                job_id: jobs.job_id,
                status: jobs.status ?? jobs.status === "Queued",
                duration: "0s",
                display_name: jobs.display_name,
                job: jobs.job,
                pushed_time: new Date(),
                start_time: null,
                end_time: null,
                ide_handle
            };
        },
        _removeOldestIfExceedsLimit() {
            const settingsStore = useSettingsStore();

            if (Object.keys(this.jobs).length == settingsStore.settings.limit_dumps + 1) {
                const oldestLogKey = Object.keys(this.jobs).reduce((oldestKey, currentKey) => {
                    return this.jobs[currentKey].pushed_time < this.jobs[oldestKey].pushed_time ? currentKey : oldestKey;
                }, Object.keys(this.jobs)[0]);

                delete this.jobs[oldestLogKey];
            }
        },
        clear() {
            this.jobs = {};
        }
    }
});
