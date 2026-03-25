import { IdeHandle } from '@/types/IdeHandle';
import { defineStore } from 'pinia';
import { useSettingsStore } from '@/store/settings';

export type BrainAction = {
    id: string;
    name: string;
    class: string;
    status: 'pending' | 'processing' | 'processed' | 'error' | 'cancelled' | 'skipped' | 'stale';
    payload: any;
    timestamp: number;
    ide_handle?: IdeHandle | null;
    firstSeen: number;
    lastSeen: number;
    meta: Record<string, unknown> | null;
};

export type WorkflowSummaryAction = {
    id: string;
    name: string;
    status: string;
    duration: number | null;
};

export type BrainWorkflow = {
    id: string;
    run_workflow_id: string;
    applicationPath: string | null;
    startedAt: string | null;
    updatedAt: string | null;
    className: string;
    ide_handle?: IdeHandle | null;

    workflow: {
        id: string;
        name: string;
        status: string;
        actions: BrainAction[];
    };
};

export type BrainStoreState = {
    brains: Record<string, BrainWorkflow>;
};

export const useBrainStore = defineStore('brainStore', {
    state: (): BrainStoreState => ({
        brains: {}
    }),

    actions: {
        addOrUpdateBrain(payload: any) {
            const runWorkflowId = String(payload.brain.run_workflow_id);

            const eventType = payload.brain.type;
            const className = payload.brain.className || null;
            const applicationPath = payload.application_path || null;
            const ideHandle: IdeHandle | undefined = payload.ide_handle;

            const statusRaw = String(payload.brain.status || 'pending').toLowerCase();
            const statusMap: Record<string, BrainAction['status']> = {
                processing: 'processing',
                processed: 'processed',
                error: 'error',
                cancelled: 'cancelled',
                skipped: 'skipped',
                pending: 'pending',
                stale: 'stale'
            };
            const status = statusMap[statusRaw] ?? 'stale';
            const microtimeRaw = payload.brain.meta?.microtime;
            const microtime = typeof microtimeRaw === 'number' ? Math.round(microtimeRaw * 1000) : Date.now();

            const actionPayload = payload.brain.payload ?? null;
            const actionMeta = payload.brain.meta ?? null;

            this._removeOldestBrainsIfExceedsLimit();

            if (!this.brains[runWorkflowId]) {
                this.initializeBrainWorkflow(runWorkflowId, applicationPath, className, ideHandle);
            }

            const brain = this.brains[runWorkflowId];
            brain.updatedAt = new Date().toISOString();

            if (!brain.startedAt && status === 'processing') {
                brain.startedAt = brain.updatedAt;
            }

            if (eventType === 'action') {
                if (!className) return;

                const actionClass = className;
                const actionExecutionId = `${actionClass}-${microtime}`;
                const actions = brain.workflow.actions;

                const actionIndex = actions.findIndex((action) => action.class === actionClass);

                if (actionIndex === -1) {
                    actions.push({
                        id: actionExecutionId,
                        name: actionClass.split('\\').pop() || actionClass,
                        class: actionClass,
                        status: status as BrainAction['status'],
                        payload: actionPayload,
                        timestamp: microtime,
                        firstSeen: microtime,
                        lastSeen: microtime,
                        ide_handle: ideHandle ?? null,
                        meta: actionMeta
                    });
                } else {
                    const previous = actions[actionIndex];
                    const nextStatus = previous.status === 'error' && status !== 'processing' ? 'error' : status;

                    actions[actionIndex] = {
                        ...previous,
                        id: actionExecutionId,
                        status: nextStatus,
                        payload: actionPayload ?? previous.payload,
                        timestamp: microtime,
                        lastSeen: microtime,
                        ide_handle: ideHandle ?? previous.ide_handle,
                        firstSeen: previous.firstSeen ?? microtime,
                        meta: actionMeta ?? previous.meta
                    };
                }
            }

            brain.workflow.actions.sort((a, b) => a.firstSeen - b.firstSeen);

            const summaryActions = this._buildSummaryActions(brain.workflow.actions);

            brain.workflow = {
                id: brain.id,
                name: brain.className,
                status: this._computeSummaryStatus(summaryActions),
                actions: brain.workflow.actions
            };
        },

        _buildSummaryActions(actions: BrainAction[]): WorkflowSummaryAction[] {
            const groups = new Map<string, BrainAction[]>();

            for (const action of actions) {
                if (!groups.has(action.class)) {
                    groups.set(action.class, []);
                }
                groups.get(action.class)!.push(action);
            }

            const summaryList: WorkflowSummaryAction[] = [];

            for (const [className, occurrences] of groups.entries()) {
                occurrences.sort((a, b) => a.firstSeen - b.firstSeen);
                const last = occurrences[occurrences.length - 1];

                const firstProcessing = occurrences.find((o) => o.status === 'processing')?.firstSeen ?? null;

                const lastProcessed =
                    [...occurrences].reverse().find((o) => o.status === 'processed')?.lastSeen ?? null;

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

        _computeSummaryStatus(summaryActions: WorkflowSummaryAction[]): string {
            if (summaryActions.some((t) => t.status === 'error')) {
                return 'error';
            }

            if (summaryActions.some((t) => t.status === 'processing')) {
                return 'processing';
            }

            if (summaryActions.length > 0 && summaryActions.every((t) => t.status === 'processed')) {
                return 'processed';
            }

            return 'pending';
        },

        initializeBrainWorkflow(id: string, applicationPath: string | null, className: string, ideHandle?: IdeHandle) {
            this.brains[id] = {
                id,
                run_workflow_id: id,
                applicationPath,
                startedAt: null,
                updatedAt: null,
                className,
                ide_handle: ideHandle ?? null,
                workflow: {
                    id,
                    name: className,
                    status: 'pending',
                    actions: []
                }
            };
        },

        _removeOldestBrainsIfExceedsLimit() {
            const settingsStore = useSettingsStore();
            const limit = settingsStore.settings.limit_laravel_jobs ?? settingsStore.settings.limit_dumps ?? 50;

            const keys = Object.keys(this.brains);
            if (keys.length <= limit) return;

            const oldest = keys.reduce((currentOldest, current) => {
                const currentTime = this.brains[current].updatedAt
                    ? new Date(this.brains[current].updatedAt!).getTime()
                    : 0;

                const oldestTime = this.brains[currentOldest].updatedAt
                    ? new Date(this.brains[currentOldest].updatedAt!).getTime()
                    : 0;

                return currentTime < oldestTime ? current : currentOldest;
            }, keys[0]);

            delete this.brains[oldest];
        },

        clear() {
            this.brains = {};
        }
    }
});
