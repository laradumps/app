import { defineStore } from "pinia";

export const usePrivacy = defineStore("privacy", {
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
