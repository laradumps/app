import { defineStore } from "pinia";

export const useAppearanceStore = defineStore("theme", {
    state: () => {
        return {
            theme: localStorage.theme
        };
    },
    actions: {
        setTheme(theme: string) {
            localStorage.theme = theme;
            this.theme = theme;
        },
        getTheme() {
            return this.theme;
        }
    }
});
