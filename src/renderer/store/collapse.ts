import { defineStore } from "pinia";

export const useCollapse = defineStore("collapse", {
    state: () => {
        return {
            open: true
        };
    },
    actions: {
        toggle() {
            this.open = !this.open;
        }
    }
});
