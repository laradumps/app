import { defineStore } from "pinia";
import { JobPayload } from "@/types/Payload";
import { IdeHandle } from "@/types/IdeHandle";

type Job = {
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
            if (!this.jobs[jobs.job_id] && jobs.status === "Queued") {
                this._initializeJob(jobs, ide_handle);
            }

            this.jobs[jobs.job_id].status = this.jobs[jobs.job_id].status !== "Failed" ? jobs.status : "Failed";

            if (jobs.status === "Processing") {
                this.jobs[jobs.job_id].start_time = new Date();
            }

            if (["Processed", "Failed"].includes(jobs.status)) {
                this.jobs[jobs.job_id].end_time = new Date();
            }
        },
        _initializeJob(jobs: JobPayload, ide_handle: IdeHandle) {
            this.jobs[jobs.job_id] = {
                job_id: jobs.job_id,
                status: jobs.status,
                duration: "0s",
                display_name: jobs.display_name,
                job: jobs.job,
                pushed_time: new Date(),
                start_time: null,
                end_time: null,
                ide_handle
            };
        }
    }
});
