import { defineStore } from "pinia";

export const useSettingStore = defineStore("settingStore", {
    state: () => {
        return {
            setting: false
        };
    },
    actions: {
        toggle() {
            this.setting = !this.setting;
        }
    }
});
