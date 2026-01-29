import { defineStore } from 'pinia';

export const useFormattedQueriesStore = defineStore('formattedQueries', {
    state: () => {
        return {
            formatted: false
        };
    },
    actions: {
        toggle() {
            this.formatted = !this.formatted;
        }
    }
});
