import { defineStore } from "pinia";

export const useEnableGlobalShortcuts = defineStore("enableGlobalShortcuts", {
    state: () => {
        return {
            enable: localStorage.enableGlobalShortcuts
        };
    },
    actions: {
        enable() {
            localStorage.enableGlobalShortcuts = "true";
        },
        isEnable() {
            return localStorage.enableGlobalShortcuts === "true";
        },
        disable() {
            localStorage.enableGlobalShortcuts = "false";
        }
    }
});
