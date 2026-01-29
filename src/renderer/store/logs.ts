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
    ide_handle: IdeHandle;
    code_snippet: CodeSnippet[];
    color: string;
    queries: string[];
    requests: any[];
    app?: {
        php_version: string;
        laravel_version: string;
        environment: string;
    };
};

type State = {
    logs: Record<string, Log>;
};

export const useLogStore = defineStore('logStore', {
    state: (): State => ({
        logs: JSON.parse(localStorage.getItem('logs') || '{}')
    }),
    actions: {
        add(content: Payload) {
            if (!content.log_application) {
                return;
            }

            const rawId = content.log_application.context[1];
            const log_id = `log_${rawId}`;

            this._removeOldestIfExceedsLimit();

            if (!this.logs[log_id]) {
                this._initialize(content);
            }
        },
        store() {
            localStorage.setItem('logs', JSON.stringify(this.logs));
        },
        clear() {
            this.logs = {};
            localStorage.removeItem('logs');
            this.store();
        },
        _initialize(payload: Payload) {
            const { log_application, code_snippet, ide_handle } = payload;

            if (!log_application) {
                return;
            }

            const date = new Date();

            const log_id = `log_${log_application.context[1]}`;

            this.logs[log_id] = {
                log_id,
                level: log_application.level,
                context: log_application.context,
                message: log_application.message,
                created_at: date,
                code_snippet,
                ide_handle,
                color: this._parseColor(log_application.level),
                queries: log_application.queries || [],
                requests: log_application.request || [],
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
        },
        _removeOldestIfExceedsLimit() {
            const settingsStore = useSettingsStore();

            if (Object.keys(this.logs).length == settingsStore.settings.limit_laravel_logs + 1) {
                const oldestLogKey = Object.keys(this.logs).reduce((oldestKey, currentKey) => {
                    return this.logs[currentKey].created_at < this.logs[oldestKey].created_at ? currentKey : oldestKey;
                }, Object.keys(this.logs)[0]);

                delete this.logs[oldestLogKey];
            }
        }
    }
});
