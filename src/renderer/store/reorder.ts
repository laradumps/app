import { defineStore } from "pinia";

export const useReorder = defineStore("reorder", {
    state: () => {
        return {
            reverse: true
        };
    },
    actions: {
        set(value: String) {
            this.reverse = value === "top";
        }
    }
});
