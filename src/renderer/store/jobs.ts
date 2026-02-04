import { defineStore } from 'pinia';
import { CodeSnippet, JobPayload, Payload } from '@/types/Payload';
import { IdeHandle } from '@/types/IdeHandle';
import { useSettingsStore } from '@/store/settings';

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
    code_snippet?: CodeSnippet[];
    exception_message: string | null;
    original_content?: string;
};

type State = {
    jobs: Record<string, Job>;
};

export const useJobStore = defineStore('jobStore', {
    state: (): State => ({
        jobs: {}
    }),
    actions: {
        addOrUpdateJob(payload: Payload) {
            const job: JobPayload = payload.jobs;
            const ide_handle: IdeHandle = payload.ide_handle;
            const code_snippet: null | CodeSnippet[] = payload.code_snippet ? payload.code_snippet.slice(0, 10) : null;

            this._removeOldestIfExceedsLimit();

            if (!this.jobs[job.job_id]) {
                this._initializeJob(job, ide_handle);
            }

            if (this.jobs[job.job_id]) {
                this.jobs[job.job_id].status = this.jobs[job.job_id].status !== 'Failed' ? job.status : 'Failed';

                if (job.status === 'Processing') {
                    this.jobs[job.job_id].start_time = new Date();
                }

                if (['Processed', 'Failed'].includes(job.status)) {
                    this.jobs[job.job_id].end_time = new Date();
                }

                if (job.status === 'Failed' && code_snippet) {
                    this.jobs[job.job_id].code_snippet = code_snippet;
                    this.jobs[job.job_id].exception_message = job.exception_message ?? '';
                }
            }
        },
        _initializeJob(jobs: JobPayload, ide_handle: IdeHandle) {
            this.jobs[jobs.job_id] = {
                job_id: jobs.job_id,
                status: jobs.status ?? jobs.status === 'Queued',
                duration: '0s',
                display_name: jobs.display_name,
                job: jobs.job,
                pushed_time: new Date(),
                start_time: null,
                end_time: null,
                exception_message: '',
                ide_handle,
                original_content: jobs.original_content
            };
        },
        _removeOldestIfExceedsLimit() {
            const settingsStore = useSettingsStore();

            if (Object.keys(this.jobs).length == settingsStore.settings.limit_laravel_jobs + 1) {
                const oldestLogKey = Object.keys(this.jobs).reduce((oldestKey, currentKey) => {
                    return this.jobs[currentKey].pushed_time < this.jobs[oldestKey].pushed_time
                        ? currentKey
                        : oldestKey;
                }, Object.keys(this.jobs)[0]);

                delete this.jobs[oldestLogKey];
            }
        },
        clear() {
            this.jobs = {};
        }
    }
});
