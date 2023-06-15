import { defineStore } from "pinia";

export const useReorder = defineStore("reorder", {
    state: () => {
        return {
            reverse: true
        };
    },
    actions: {
        toggle() {
            this.reverse = !this.reverse;
        }
    }
});
