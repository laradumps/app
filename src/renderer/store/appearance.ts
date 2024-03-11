import { defineStore } from "pinia";

export const useAppearanceStore = defineStore("theme", {
    state: () => {
        return {
            value: 'light'
        };
    },
    actions: {
        setTheme(theme: string) {
            this.value = theme;
            localStorage.theme = theme
        }
    }
});
