import { defineStore } from "pinia";
import { CodeSnippet, LogApplicationPayload } from "@/types/Payload";
import { IdeHandle } from "@/types/IdeHandle";
import { useSettingsStore } from "@/store/settings";

export type Log = {
    log_id: string;
    level: string;
    context: string | string[];
    message: any;
    created_at: Date;
    ide_handle: IdeHandle;
    code_snippet: CodeSnippet;
    color: string;
};

type State = {
    logs: Record<string, Log>;
};

export const useLogStore = defineStore("logStore", {
    state: (): State => ({
        logs: JSON.parse(localStorage.getItem("logs") || "[]")
    }),
    actions: {
        add(log: LogApplicationPayload, code_snippet: CodeSnippet, ide_handle: IdeHandle) {
            const log_id = log.context[1];

            this._removeOldestIfExceedsLimit();

            if (!this.logs[log_id]) {
                this._initialize(log, code_snippet, ide_handle);
            }
        },
        store() {
            localStorage.setItem("logs", JSON.stringify(this.logs));
        },
        clear() {
            this.logs = {};
            this.store();
        },
        _initialize(payload: LogApplicationPayload, code_snippet: CodeSnippet, ide_handle: IdeHandle) {
            const date = new Date();

            const log_id = payload.context[1];

            this.logs[log_id] = {
                log_id: payload.context[1],
                level: payload.level,
                context: payload.context,
                message: payload.message,
                created_at: date,
                code_snippet,
                ide_handle,
                color: this._parseColor(payload.level)
            };

            console.log(this.logs[log_id]);
        },
        _parseColor(level: string) {
            switch (level) {
                case "error":
                    return "red";
                case "critical":
                    return "red";
                case "alert":
                    return "red";
                case "warning":
                    return "orange";
                case "emergency":
                    return "red";
                case "info":
                    return "blue";
                case "debug":
                    return "gray";
                case "notice":
                    return "green";

                default:
                    return "gray";
            }
        },
        _removeOldestIfExceedsLimit() {
            const settingsStore = useSettingsStore();

            if (Object.keys(this.logs).length == settingsStore.settings.limit_dumps + 1) {
                const oldestLogKey = Object.keys(this.logs).reduce((oldestKey, currentKey) => {
                    return this.logs[currentKey].created_at < this.logs[oldestKey].created_at ? currentKey : oldestKey;
                }, Object.keys(this.logs)[0]);

                delete this.logs[oldestLogKey];
            }
        }
    }
});
