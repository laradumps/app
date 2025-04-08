import { defineStore } from "pinia";

interface Type {
    type: string;
}

export const useQueriesChart = defineStore("queriesChart", {
    state: (): Type => ({
        type: "none"
    }),
    actions: {
        setType(type: string) {
            this.type = type;
        }
    }
});
