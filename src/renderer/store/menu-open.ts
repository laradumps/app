import { defineStore } from "pinia";

export const useMenuOpenStore = defineStore("menuStore", {
    state: () => {
        return {
            show: true
        };
    },
    actions: {
        toggle() {
            this.show = !this.show;
        }
    }
});
