import { defineStore } from "pinia";

export const useGlobalSearchStore = defineStore("globalSearch", {
    state: () => {
        return { search: "" };
    },
    actions: {
        clear() {
            this.search = "";
        }
    }
});
