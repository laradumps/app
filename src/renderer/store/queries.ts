import { defineStore } from 'pinia';
import { Payload } from '@/types/Payload';
import { useSettingsStore } from '@/store/settings';
import { useQueriesBlockedStore } from '@/store/queries-blocked';

export type Query = Payload & {
    original_content?: string;
};

type State = {
    payload: Query[];
};

export const useQueriesPayloadStore = defineStore('queriesPayload', {
    state: (): State => ({
        payload: []
    }),
    actions: {
        add(payload: Payload) {
            const queriesBlockedStore = useQueriesBlockedStore();
            if (payload.queries && queriesBlockedStore.blocked.includes(payload.queries.query.sql)) {
                return;
            }

            this._removeOldestIfExceedsLimit();

            const queryData: Query = {
                ...payload,
                original_content: payload.queries?.original_content
            };
            this.payload.push(queryData);
        },
        clear() {
            this.payload = [];
        },
        _removeOldestIfExceedsLimit() {
            const settingsStore = useSettingsStore();
            const limit = settingsStore.settings.limit_laravel_queries;

            if (this.payload.length >= limit) {
                this.payload.sort((a, b) => a.date_time.getTime() - b.date_time.getTime());
                this.payload.shift();
            }
        },
        hasExplainNodes(requestId: string): boolean {
            return this.payload.some(
                (payload) =>
                    payload.request_id === requestId &&
                    payload.queries?.explain_nodes &&
                    payload.queries.explain_nodes.length > 0
            );
        }
    }
});
