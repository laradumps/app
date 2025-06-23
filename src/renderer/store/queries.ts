import { defineStore } from "pinia";
import { Payload } from "@/types/Payload";
import { useSettingsStore } from "@/store/settings";
import { useQueriesBlockedStore } from "@/store/queries-blocked";

type State = {
    payload: Payload[];
};

export const useQueriesPayloadStore = defineStore("queriesPayload", {
    state: (): State => ({
        payload: []
    }),
    actions: {
        add(payload: Payload) {
            const queriesBlockedStore = useQueriesBlockedStore();
            if (queriesBlockedStore.blocked.includes(payload.queries.query?.sql)) {
                return;
            }

            this._removeOldestIfExceedsLimit();
            this.payload.push(payload);
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
        }
    }
});
