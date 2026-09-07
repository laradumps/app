import { defineStore } from 'pinia';
import dayjs, { Dayjs } from 'dayjs';
import { QueriesPayload } from '@/types/Payload';
import { useSettingsStore } from '@/store/settings';

export type Request = {
    time: string;
    request_id: string;
    total: number;
    uri: string;
    method: string;
    origin: string;
    date: Dayjs;
};

type RequestsMap = Record<string, Request>;

type State = {
    search: string;
    requests: RequestsMap;
    groups: string[];
    dump_ids: string[];
    selected: string | null;
    order: 'default' | 'asc' | 'desc';
};

export const useTimeStore = defineStore('timeStore', {
    state: (): State => ({
        search: '',
        requests: {},
        groups: [],
        dump_ids: [],
        selected: null,
        order: 'default'
    }),

    actions: {
        hasRequest(requestId: string): boolean {
            return requestId in this.requests;
        },

        getTime(requestId: string): string | null {
            return this.hasRequest(requestId) ? this.requests[requestId].time : null;
        },

        getDate(requestId: string): Dayjs | null {
            return this.hasRequest(requestId) ? this.requests[requestId].date : null;
        },

        get(requestId: string): Request | null {
            return this.requests[requestId] ?? null;
        },

        toggleOrder(): void {
            if (this.order === 'default') {
                this.order = 'desc';
                return;
            }

            if (this.order === 'desc') {
                this.order = 'asc';
                return;
            }

            this.order = 'default';
        },

        getSelectedRequest(): Request | null {
            if (!this.selected) {
                return null;
            }
            return this.get(this.selected);
        },

        getTotal(requestId: string): number {
            return this.hasRequest(requestId) ? this.requests[requestId].total : 0;
        },

        getUri(requestId: string): string | null {
            return this.hasRequest(requestId) ? this.requests[requestId].uri : null;
        },

        getOrigin(requestId: string): string | null {
            return this.hasRequest(requestId) ? this.requests[requestId].origin : null;
        },

        getMethod(requestId: string): string | null {
            return this.hasRequest(requestId) ? this.requests[requestId].method : null;
        },

        setSelectedRequest(value: string | null): void {
            this.selected = value;
        },

        increment(requestId: string, dumpId: string, queriesPayload: QueriesPayload): void {
            if (this.dump_ids.includes(dumpId)) {
                return;
            }

            const existing = this.requests[requestId];
            const total = (existing?.total ?? 0) + queriesPayload.time;

            this.requests[requestId] = {
                request_id: requestId,
                total,
                time: dayjs().format('HH:mm:ss a'),
                uri: queriesPayload.uri,
                method: queriesPayload.method,
                origin: queriesPayload.origin,
                date: dayjs()
            };

            if (!this.groups.includes(requestId)) {
                this.groups.push(requestId);
            }

            this.dump_ids.push(dumpId);

            this._enforceLimit();
        },

        _enforceLimit(): void {
            const limit = useSettingsStore().settings.limit_dumps || 500;

            while (this.groups.length > limit) {
                const oldest = this.groups.shift();
                if (oldest) {
                    delete this.requests[oldest];
                    if (this.selected === oldest) {
                        this.selected = null;
                    }
                }
            }

            const maxDumpIds = limit * 50;
            if (this.dump_ids.length > maxDumpIds) {
                this.dump_ids.splice(0, this.dump_ids.length - maxDumpIds);
            }
        },

        clear(): void {
            this.requests = {};
            this.dump_ids = [];
            this.groups = [];
            this.selected = null;
            this.order = 'default';
        },

        recycle(maxItems: number): void {
            while (this.groups.length > maxItems) {
                const oldest = this.groups.shift();
                if (oldest) {
                    delete this.requests[oldest];
                    if (this.selected === oldest) {
                        this.selected = null;
                    }
                }
            }

            const maxDumpIds = maxItems * 50;
            if (this.dump_ids.length > maxDumpIds) {
                this.dump_ids.splice(0, this.dump_ids.length - maxDumpIds);
            }
        },

        getRequestCount(): number {
            return Object.keys(this.requests).length;
        }
    }
});
