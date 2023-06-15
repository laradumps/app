import { defineStore } from "pinia";

export const useDarkModeStore = defineStore("darkMode", {
    state: () => {
        return {
            dark: localStorage.darkMode === "true"
        };
    },
    actions: {
        toggle() {
            localStorage.darkMode = !this.dark;
            this.dark = !this.dark;
        }
    }
});
