import { defineStore } from 'pinia';
import { CodeSnippet, Payload } from '@/types/Payload';
import { IdeHandle } from '@/types/IdeHandle';
import { useSettingsStore } from '@/store/settings';

export type Log = {
    log_id: string;
    level: string;
    context: string | string[];
    message: any;
    created_at: Date;
    original_content: string;
    ide_handle: IdeHandle;
    code_snippet: CodeSnippet[];
    color: string;
    queries: string[];
    requests: any[];
    related_job?: { job_id: string; display_name: string };
    app?: {
        php_version: string;
        laravel_version: string;
        environment: string;
    };
};

type State = {
    logs: Record<string, Log>;
    incoming: Record<string, Log>;
};

const PAGE_SIZE = 25;
const MAX_LOADED_PAGES = 5;
const MAX_BUFFERED_PAGES = 5;

const trim = (items: Record<string, Log>, max: number) => {
    const keys = Object.keys(items);
    if (keys.length <= max) {
        return;
    }

    keys.sort((a, b) => (items[a].created_at < items[b].created_at ? -1 : 1));

    const toRemove = keys.length - max;
    for (let i = 0; i < toRemove; i++) {
        delete items[keys[i]];
    }
};

let persistTimer: ReturnType<typeof setTimeout> | null = null;

export const useLogStore = defineStore('logStore', {
    state: (): State => ({
        logs: JSON.parse(localStorage.getItem('logs') || '{}'),
        incoming: {}
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
            const limit = Number(settingsStore.settings.limit_laravel_logs);

            if (Number.isFinite(limit) && limit > 0) {
                return Math.max(PAGE_SIZE, limit);
            }

            return PAGE_SIZE * MAX_LOADED_PAGES;
        }
    },
    actions: {
        recycle(maxItems: number, dropIncoming = false) {
            if (dropIncoming) {
                this.incoming = {};
            }
            trim(this.logs, maxItems);
            this.store();
        },
        add(content: Payload) {
            if (!content.log_application) {
                return;
            }

            const rawId = content.log_application.context[1];
            const log_id = `log_${rawId}`;

            const bucket = this.logs[log_id]
                ? this.logs
                : this.incoming[log_id]
                  ? this.incoming
                  : this._bucketForNewLog();

            if (!bucket[log_id]) {
                this._initialize(bucket, content);

                if (bucket === this.incoming) {
                    trim(this.incoming, this.pageSize * MAX_BUFFERED_PAGES);
                }
            }
        },
        _bucketForNewLog(): Record<string, Log> {
            return Object.keys(this.logs).length >= this.pageSize ? this.incoming : this.logs;
        },
        loadIncoming(loadAll = false) {
            const values = Object.values(this.incoming).sort(
                (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
            const page = loadAll ? values : values.slice(0, this.pageSize);

            for (const log of page) {
                this.logs[log.log_id] = log;
                delete this.incoming[log.log_id];
            }

            trim(this.logs, this.maxItems);
            this.store();
        },
        store() {
            if (persistTimer) clearTimeout(persistTimer);
            persistTimer = setTimeout(() => {
                localStorage.setItem('logs', JSON.stringify(this.logs));
            }, 300);
        },
        clear() {
            this.logs = {};
            this.incoming = {};
            localStorage.removeItem('logs');
            this.store();
        },
        _initialize(bucket: Record<string, Log>, payload: Payload) {
            const { log_application, code_snippet, ide_handle } = payload;

            if (!log_application) {
                return;
            }

            const log_id = `log_${log_application.context[1]}`;

            bucket[log_id] = {
                log_id,
                level: log_application.level,
                context: log_application.context,
                original_content: log_application.original_content,
                message: log_application.message,
                created_at: new Date(),
                code_snippet,
                ide_handle,
                color: this._parseColor(log_application.level),
                queries: log_application.queries || [],
                requests: log_application.request || [],
                related_job: payload.related_job || undefined,
                app: log_application.app || undefined
            };
        },
        _parseColor(level: string) {
            switch (level) {
                case 'error':
                case 'critical':
                case 'alert':
                case 'emergency':
                    return 'red';
                case 'warning':
                    return 'orange';
                case 'info':
                    return 'blue';
                case 'notice':
                    return 'green';
                default:
                    return 'gray';
            }
        }
    }
});
