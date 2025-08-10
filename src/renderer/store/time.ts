import { defineStore } from "pinia";
import moment from "moment";
import { QueriesPayload } from "@/types/Payload";

type Requests = {
    time: number | string;
    requestId: number | string;
    total: number;
    uri: string;
    method: string;
    origin: string;
};

type State = {
    search: string;
    requests: Requests[];
    groups: string[];
    dumpIds: string[];
    selected: string;
    order: string;
};

export const useTimeStore = defineStore("timeStore", {
    state: (): State => {
        return {
            search: "",
            requests: [],
            groups: [],
            dumpIds: [],
            selected: "",
            order: "default"
        };
    },
    actions: {
        getTime(requestId: never) {
            if (typeof this.requests[requestId] === "undefined") {
                return 0;
            }

            return this.requests[requestId].time;
        },

        get(requestId: never) {
            return this.requests[requestId];
        },

        toggleOrder() {
            const currentOrder = this.order;

            if (!currentOrder || currentOrder === "default") {
                this.order = "desc";
            } else if (currentOrder === "desc") {
                this.order = "asc";
            } else {
                this.order = "default";
            }
        },

        getSelectedRequest() {
            if (typeof this.requests[this.selected] === "undefined") {
                return 0;
            }

            return this.requests[this.selected];
        },

        getTotal(requestId: never) {
            if (typeof this.requests[requestId] === "undefined") {
                return 0;
            }

            return this.requests[requestId].total;
        },

        getUri(requestId: never) {
            if (typeof this.requests[requestId] === "undefined") {
                return 0;
            }

            return this.requests[requestId].uri;
        },

        getOrigin(requestId: never) {
            if (typeof this.requests[requestId] === "undefined") {
                return 0;
            }

            return this.requests[requestId].origin;
        },

        getMethod(requestId: never) {
            if (typeof this.requests[requestId] === "undefined") {
                return 0;
            }

            return this.requests[requestId].method;
        },

        setOrder(value: never) {
            if (this.order === value) {
                this.order = "default";
                return;
            }
            this.order = value;
        },

        setSelectedRequest(value: string) {
            this.selected = value;
        },

        increment(requestId: string, dumpId: string, queriesPayload: QueriesPayload) {
            if (this.dumpIds.includes(dumpId)) {
                return;
            }

            if (typeof this.requests[requestId] === "undefined") {
                this.requests[requestId] = {
                    requestId: 0,
                    total: 0,
                    time: moment().format("HH:mm:ss")
                };
            }

            const total = (this.requests[requestId].total += queriesPayload.time);

            this.requests[requestId] = {
                requestId,
                total,
                time: moment().format("HH:mm:ss a"),
                uri: queriesPayload.uri,
                method: queriesPayload.method,
                origin: queriesPayload.origin
            };

            if (!this.groups.includes(requestId)) {
                this.groups.push(requestId);
            }

            this.dumpIds.push(dumpId);
        },

        clear() {
            this.requests = [];
            this.dumpIds = [];
            this.groups = [];
        }
    }
});
