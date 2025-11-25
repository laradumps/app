import { IdeHandle } from "@/types/IdeHandle";
import { defineStore } from "pinia";
import { useSettingsStore } from "@/store/settings";

export type BrainTask = {
    id: string;
    name: string;
    class: string;
    status: "pending" | "processing" | "processed" | "error" | "cancelled" | "skipped" | "stale";
    payload: any;
    timestamp: number;
    ide_handle?: IdeHandle | null;
    firstSeen: number;
    lastSeen: number;
    meta: Record<string, unknown> | null;
};

export type ProcessSummaryTask = {
    id: string;
    name: string;
    status: string;
    duration: number | null;
};

export type BrainProcess = {
    id: string;
    run_process_id: string;
    applicationPath: string | null;
    startedAt: string | null;
    updatedAt: string | null;
    className: string;
    ide_handle?: IdeHandle | null;

    process: {
        id: string;
        name: string;
        status: string;
        tasks: BrainTask[];
    };
};

export type BrainStoreState = {
    brains: Record<string, BrainProcess>;
};

export const useBrainStore = defineStore("brainStore", {
    state: (): BrainStoreState => ({
        brains: {}
    }),

    actions: {
        addOrUpdateBrain(payload: any) {
            const runProcessId = String(payload.brain.run_process_id);

            const eventType = payload.brain.type;
            const className = payload.brain.className || null;
            const applicationPath = payload.application_path || null;
            const ideHandle: IdeHandle | undefined = payload.ide_handle;

            const status = String(payload.brain.status || "pending").toLowerCase();
            const microtimeRaw = payload.brain.meta?.microtime;
            const microtime = typeof microtimeRaw === "number" ? Math.round(microtimeRaw * 1000) : Date.now();

            const taskPayload = payload.brain.payload ?? null;
            const taskMeta = payload.brain.meta ?? null;

            this._removeOldestBrainsIfExceedsLimit();

            if (!this.brains[runProcessId]) {
                this._initializeBrainProcess(runProcessId, applicationPath, className, ideHandle);
            }

            const brain = this.brains[runProcessId];
            brain.updatedAt = new Date().toISOString();

            if (!brain.startedAt && status === "processing") {
                brain.startedAt = brain.updatedAt;
            }

            if (eventType === "task") {
                if (!className) return;

                const taskClass = className;
                const taskExecutionId = `${taskClass}-${microtime}`;
                const tasks = brain.process.tasks;

                const taskIndex = tasks.findIndex((task) => task.class === taskClass);

                if (taskIndex === -1) {
                    tasks.push({
                        id: taskExecutionId,
                        name: taskClass.split("\\").pop() || taskClass,
                        class: taskClass,
                        status: status as BrainTask["status"],
                        payload: taskPayload,
                        timestamp: microtime,
                        firstSeen: microtime,
                        lastSeen: microtime,
                        ide_handle: ideHandle ?? null,
                        meta: taskMeta
                    });
                } else {
                    const previous = tasks[taskIndex];
                    const nextStatus = previous.status === "error" && status !== "processing" ? "error" : status;

                    tasks[taskIndex] = {
                        ...previous,
                        id: taskExecutionId,
                        status: nextStatus,
                        payload: taskPayload ?? previous.payload,
                        timestamp: microtime,
                        lastSeen: microtime,
                        ide_handle: ideHandle ?? previous.ide_handle,
                        firstSeen: previous.firstSeen ?? microtime,
                        meta: taskMeta ?? previous.meta
                    };
                }
            }

            brain.process.tasks.sort((a, b) => a.firstSeen - b.firstSeen);

            const summaryTasks = this._buildSummaryTasks(brain.process.tasks);

            brain.process = {
                id: brain.id,
                name: brain.className,
                status: this._computeSummaryStatus(summaryTasks),
                tasks: brain.process.tasks
            };
        },

        _buildSummaryTasks(tasks: BrainTask[]): ProcessSummaryTask[] {
            const groups = new Map<string, BrainTask[]>();

            for (const task of tasks) {
                if (!groups.has(task.class)) {
                    groups.set(task.class, []);
                }
                groups.get(task.class)!.push(task);
            }

            const summaryList: ProcessSummaryTask[] = [];

            for (const [className, occurrences] of groups.entries()) {
                occurrences.sort((a, b) => a.firstSeen - b.firstSeen);
                const last = occurrences[occurrences.length - 1];

                const firstProcessing = occurrences.find((o) => o.status === "processing")?.firstSeen ?? null;

                const lastProcessed = [...occurrences].reverse().find((o) => o.status === "processed")?.lastSeen ?? null;

                let duration: number | null = null;

                if (firstProcessing && lastProcessed && lastProcessed >= firstProcessing) {
                    duration = lastProcessed - firstProcessing;
                } else if (last.firstSeen && last.lastSeen && last.lastSeen >= last.firstSeen) {
                    duration = last.lastSeen - last.firstSeen;
                }

                summaryList.push({
                    id: occurrences[0].id,
                    name: className,
                    status: last.status,
                    duration
                });
            }

            return summaryList;
        },

        _computeSummaryStatus(summaryTasks: ProcessSummaryTask[]): string {
            if (summaryTasks.some((t) => t.status === "error")) {
                return "error";
            }

            if (summaryTasks.some((t) => t.status === "processing")) {
                return "processing";
            }

            if (summaryTasks.length > 0 && summaryTasks.every((t) => t.status === "processed")) {
                return "processed";
            }

            return "pending";
        },

        _initializeBrainProcess(id: string, applicationPath: string | null, className: string, ideHandle?: IdeHandle) {
            this.brains[id] = {
                id,
                run_process_id: id,
                applicationPath,
                startedAt: null,
                updatedAt: null,
                className,
                ide_handle: ideHandle ?? null,
                process: {
                    id,
                    name: className,
                    status: "pending",
                    tasks: []
                }
            };
        },

        _removeOldestBrainsIfExceedsLimit() {
            const settingsStore = useSettingsStore();
            const limit = settingsStore.settings.limit_laravel_jobs ?? settingsStore.settings.limit_dumps ?? 50;

            const keys = Object.keys(this.brains);
            if (keys.length <= limit) return;

            const oldest = keys.reduce((currentOldest, current) => {
                const currentTime = this.brains[current].updatedAt ? new Date(this.brains[current].updatedAt!).getTime() : 0;

                const oldestTime = this.brains[currentOldest].updatedAt ? new Date(this.brains[currentOldest].updatedAt!).getTime() : 0;

                return currentTime < oldestTime ? current : currentOldest;
            }, keys[0]);

            delete this.brains[oldest];
        },

        clear() {
            this.brains = {};
        }
    }
});
