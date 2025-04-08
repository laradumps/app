import { defineStore } from "pinia";

interface DuplicateInfo {
    request_id: string;
    sql: string;
    has_duplicated: boolean;
    occurrences: number;
}

interface QueryDuplicatedState {
    showOnlyDuplicated: boolean;
    duplicatesInfo: DuplicateInfo[];
    cache: Record<string, number>;
}

export const useQueryDuplicated = defineStore("queryDuplicated", {
    state: (): QueryDuplicatedState => ({
        showOnlyDuplicated: false,
        duplicatesInfo: [],
        cache: {}
    }),
    actions: {
        add(request_id: string, sql: string, has_duplicated: boolean, occurrences: number): void {
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
        totalByRequestId(request_id: string): number | undefined {
            if (request_id === "") {
                return undefined;
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
        },
        isDuplicated(request_id: string, sql: string): boolean {
            return this.duplicatesInfo.some((info) => info.request_id === request_id && info.sql === sql && info.has_duplicated);
        },
        hasDuplicatedByRequest(request_id: string): boolean {
            return this.duplicatesInfo.some((info) => info.request_id === request_id && info.has_duplicated);
        },
        toggleShowOnlyDuplicated(): void {
            this.showOnlyDuplicated = !this.showOnlyDuplicated;
        },
        clear(): void {
            this.duplicatesInfo = [];
            this.cache = {};
        }
    }
});
