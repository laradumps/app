import { defineStore } from "pinia";

interface Type {
    id: string;
}

export const useQueriesChartSelectedPoint = defineStore("queriesChartSelectPoint", {
    state: (): Type => ({
        id: ""
    }),
    actions: {
        set(id: string) {
            this.id = id;
        }
    }
});
