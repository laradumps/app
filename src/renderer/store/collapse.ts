import { defineStore } from "pinia";

export const useCollapse = defineStore("collapse", {
    state: () => {
        return {
            isOpen: true
        };
    },
    actions: {
        toggle() {
            this.isOpen = !this.isOpen;
        }
    }
});
