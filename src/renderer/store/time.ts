import { defineStore } from "pinia";
import moment from "moment";

type Requests = {
    time: number | string;
    requestId: number | string;
    total: number;
};

type State = {
    requests: Requests[];
    groups: string[];
    dumpIds: string[];
    selected: string;
    order: boolean;
};

export const useTimeStore = defineStore("timeStore", {
    state: (): State => {
        return {
            requests: [],
            groups: [],
            dumpIds: [],
            selected: "",
            order: false
        };
    },
    actions: {
        getTime(requestId: never) {
            if (typeof this.requests[requestId] === "undefined") {
                return 0;
            }

            return this.requests[requestId].time;
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
        setOrder(value: never) {
            this.order = value;
        },
        setSelectedRequest(value: string) {
            this.selected = value;
        },
        increment(requestId: string, dumpId: string, time: number | string) {
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

            const total = (this.requests[requestId].total += time);

            this.requests[requestId] = {
                requestId,
                total,
                time: moment().format("HH:mm:ss a")
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
