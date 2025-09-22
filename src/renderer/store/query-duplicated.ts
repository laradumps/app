import { defineStore } from "pinia";

interface DuplicateInfo {
    request_id: string;
    sql: string;
    occurrences: number;
}

interface QueryDuplicatedState {
    showOnlyDuplicated: boolean;
    duplicatesInfo: DuplicateInfo[];
    currentRequestId: string | null;
    selectedSql: string | null;
}

export const useQueryDuplicated = defineStore("queryDuplicated", {
    state: (): QueryDuplicatedState => ({
        showOnlyDuplicated: false,
        duplicatesInfo: [],
        currentRequestId: null,
        selectedSql: null
    }),
    getters: {
        requestsWithDuplicates(state): Set<string> {
            const requestIds = new Set<string>();
            for (const info of state.duplicatesInfo) {
                if (info.occurrences > 1) {
                    requestIds.add(info.request_id);
                }
            }
            return requestIds;
        },
        totalForCurrentRequest(state): number {
            if (!state.currentRequestId) {
                return 0;
            }
            return state.duplicatesInfo.filter((info) => info.request_id === state.currentRequestId && info.occurrences > 1).reduce((acc, info) => acc + info.occurrences, 0);
        },
        isDuplicated(state) {
            return (request_id: string, sql: string): boolean => {
                const info = state.duplicatesInfo.find((info) => info.request_id === request_id && info.sql === sql);
                return (info?.occurrences ?? 0) > 1;
            };
        },
        hasDuplicatesInCurrentRequest(state): boolean {
            if (!state.currentRequestId) {
                return false;
            }
            return state.duplicatesInfo.some((info) => info.request_id === state.currentRequestId && info.occurrences > 1);
        }
    },
    actions: {
        rebuild(items: any[]): void {
            const requestSqlCounts = new Map<string, Map<string, number>>();

            for (const item of items) {
                if (item.queries?.query?.sql) {
                    const requestId = item.request_id;
                    const sql = item.queries.query.sql;

                    if (!requestSqlCounts.has(requestId)) {
                        requestSqlCounts.set(requestId, new Map());
                    }
                    const sqlMap = requestSqlCounts.get(requestId)!;
                    sqlMap.set(sql, (sqlMap.get(sql) || 0) + 1);
                }
            }

            const newDuplicatesInfo: DuplicateInfo[] = [];
            for (const [requestId, sqlMap] of requestSqlCounts.entries()) {
                for (const [sql, count] of sqlMap.entries()) {
                    newDuplicatesInfo.push({
                        request_id: requestId,
                        sql: sql,
                        occurrences: count
                    });
                }
            }
            this.duplicatesInfo = newDuplicatesInfo;
        },
        setCurrentRequestId(id: string | null) {
            this.currentRequestId = id;
        },
        toggleShowOnlyDuplicated(): void {
            this.showOnlyDuplicated = !this.showOnlyDuplicated;
        },
        toggleSelectedSql(sql: string): void {
            if (this.selectedSql === sql) {
                this.selectedSql = null;
                return;
            }
            this.selectedSql = sql;
        },
        clear(): void {
            this.duplicatesInfo = [];
            this.selectedSql = null;
        }
    }
});
