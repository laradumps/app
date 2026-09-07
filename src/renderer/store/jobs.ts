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

export type JobOrigin = {
    screen: string;
    id?: string;
};

type State = {
    jobs: Record<string, Job>;
    incoming: Record<string, Job>;
    focusJobId: string | null;
    origin: JobOrigin | null;
};

const PAGE_SIZE = 25;
const MAX_LOADED_PAGES = 5;
const MAX_BUFFERED_PAGES = 5;

const trim = (items: Record<string, Job>, max: number) => {
    const keys = Object.keys(items);
    if (keys.length <= max) {
        return;
    }

    keys.sort((a, b) => (items[a].pushed_time < items[b].pushed_time ? -1 : 1));

    const toRemove = keys.length - max;
    for (let i = 0; i < toRemove; i++) {
        delete items[keys[i]];
    }
};

export const useJobStore = defineStore('jobStore', {
    state: (): State => ({
        jobs: {},
        incoming: {},
        focusJobId: null,
        origin: null
    }),
    getters: {
        pageSize(): number {
            return PAGE_SIZE;
        },
        incomingCount(): number {
            return Object.keys(this.incoming).length;
        },
        maxItems(): number {
            const settingsStore = useSettingsStore();
            const limit = Number(settingsStore.settings.limit_laravel_jobs);

            if (Number.isFinite(limit) && limit > 0) {
                return Math.max(PAGE_SIZE, limit);
            }

            return PAGE_SIZE * MAX_LOADED_PAGES;
        }
    },
    actions: {
        requestFocus(job_id: string, origin?: JobOrigin) {
            this.focusJobId = job_id;
            this.origin = origin ?? null;
        },
        clearFocus() {
            this.focusJobId = null;
        },
        clearOrigin() {
            this.origin = null;
        },
        addOrUpdateJob(payload: Payload) {
            const job: JobPayload = payload.jobs;
            const ide_handle: IdeHandle = payload.ide_handle;
            const code_snippet: null | CodeSnippet[] = payload.code_snippet ? payload.code_snippet.slice(0, 10) : null;

            const bucket = this.jobs[job.job_id]
                ? this.jobs
                : this.incoming[job.job_id]
                  ? this.incoming
                  : this._bucketForNewJob();

            if (!bucket[job.job_id]) {
                this._initializeJob(bucket, job, ide_handle);

                if (bucket === this.incoming) {
                    trim(this.incoming, this.pageSize * MAX_BUFFERED_PAGES);
                }
            }

            if (!bucket[job.job_id]) {
                return;
            }

            bucket[job.job_id].status = bucket[job.job_id].status !== 'Failed' ? job.status : 'Failed';

            if (job.status === 'Processing') {
                bucket[job.job_id].start_time = new Date();
            }

            if (['Processed', 'Failed'].includes(job.status)) {
                bucket[job.job_id].end_time = new Date();
            }

            if (job.status === 'Failed' && code_snippet) {
                bucket[job.job_id].code_snippet = code_snippet;
                bucket[job.job_id].exception_message = job.exception_message ?? '';
            }
        },
        _bucketForNewJob(): Record<string, Job> {
            return Object.keys(this.jobs).length >= this.pageSize ? this.incoming : this.jobs;
        },
        loadIncoming(loadAll = false) {
            const values = Object.values(this.incoming).sort(
                (a, b) => new Date(a.pushed_time).getTime() - new Date(b.pushed_time).getTime()
            );
            const page = loadAll ? values : values.slice(0, this.pageSize);

            for (const job of page) {
                this.jobs[job.job_id] = job;
                delete this.incoming[job.job_id];
            }

            trim(this.jobs, this.maxItems);
        },
        _initializeJob(bucket: Record<string, Job>, jobs: JobPayload, ide_handle: IdeHandle) {
            bucket[jobs.job_id] = {
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
        clear() {
            this.jobs = {};
            this.incoming = {};
        }
    }
});
