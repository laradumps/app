import { defineStore } from "pinia";

interface Origin {
    origin: string[];
}

export const useQueriesOriginFilter = defineStore("queriesOriginFilter", {
    state: (): Origin => ({
        origin: ["http", "console"]
    }),
    actions: {
        toggleFilter(origin: string) {
            const index = this.origin.indexOf(origin);
            if (index === -1) {
                this.origin.push(origin);
            } else {
                this.origin.splice(index, 1);
            }
        }
    }
});
