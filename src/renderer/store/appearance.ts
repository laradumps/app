import { defineStore } from "pinia";

export const useAppearanceStore = defineStore("darkMode", {
    state: () => {
        return {
            dark: localStorage.darkMode === "true",
            theme: localStorage.theme
        };
    },
    actions: {
        toggle() {
            localStorage.darkMode = !this.dark;
            this.dark = !this.dark;
        },
        setDark(isTheme = false) {
            localStorage.darkMode = true;
            this.dark = true;

            if (isTheme) {
                localStorage.theme = "dark";
                this.theme = "dark";
            }
        },
        setLight(isTheme = false) {
            localStorage.darkMode = false;
            this.dark = false;

            if (isTheme) {
                localStorage.theme = "light";
                this.theme = "light";
            }
        },
        setAuto() {
            localStorage.theme = "auto";
            this.theme = "auto";
        }
    }
});
