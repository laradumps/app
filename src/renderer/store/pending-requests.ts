import { defineStore } from 'pinia';

type PendingRequest = {
    [key: string]: any;
};

type State = {
    pendingRequests: Record<string, Record<string, PendingRequest>>;
};

export const usePendingRequestsStore = defineStore('pendingRequests', {
    state: (): State => ({
        pendingRequests: {}
    }),

    actions: {
        add(type: 'queries', requestId: string, content: any) {
            if (!this.pendingRequests[type]) {
                this.pendingRequests[type] = {};
            }
            this.pendingRequests[type][requestId] = content;
        },

        has(type: 'queries', requestId: string): boolean {
            return !!this.pendingRequests[type]?.[requestId];
        },

        get(type: 'queries', requestId: string): any | undefined {
            return this.pendingRequests[type]?.[requestId] ?? null;
        },

        clear(type: 'queries') {
            if (this.pendingRequests[type]) {
                delete this.pendingRequests[type];
            }
        }
    }
});
