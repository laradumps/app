import { defineStore } from "pinia";

export const useFormattedQueriesStore = defineStore("formattedQueries", {
    state: () => {
        return {
            formatted: true
        };
    },
    actions: {
        toggle() {
            this.formatted = !this.formatted;
        }
    }
});
