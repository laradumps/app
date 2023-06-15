import { defineStore } from "pinia";

export const useI18nStore = defineStore("i18n", {
    state: () => {
        return {
            value: localStorage.locale
        };
    },
    actions: {
        set(value: string) {
            localStorage.locale = value;
            this.value = value;
        },
        remove() {
            localStorage.removeItem("locale");
            this.value = null;
        }
    }
});
