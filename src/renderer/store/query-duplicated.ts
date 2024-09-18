import { defineStore } from "pinia";

export const useQueryDuplicated = defineStore("queryDuplicated", {
    state: () => ({
        duplicatesInfo: [],
        cache: []
    }),
    actions: {
        add(request_id: String, sql: String, has_duplicated: Boolean, occurrences: Number) {
            const existingInfo = this.duplicatesInfo.find((info) => info.request_id === request_id && info.sql === sql);

            if (!existingInfo) {
                this.duplicatesInfo.push({
                    request_id,
                    has_duplicated,
                    sql,
                    occurrences
                });
            }
        },
        totalByRequestId(request_id: String) {
            if (request_id == "") {
                return;
            }

            if (this.cache[request_id] !== undefined && this.cache[request_id] > 0) {
                return this.cache[request_id];
            }

            const total = this.duplicatesInfo
                .filter((info) => info.request_id === request_id && info.has_duplicated)
                .map((info) => info.occurrences)
                .reduce((acc, occurrences) => acc + occurrences, 0);

            this.cache[request_id] = total;

            return total;
        }
    }
});
