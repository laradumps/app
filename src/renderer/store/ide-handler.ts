import { defineStore } from "pinia";

export const useIDEHandlerStore = defineStore("ide-handler", {
    state: () => {
        return {
            value: null
        };
    },
    actions: {
        setValue(value: string) {
            this.value = value;
            localStorage.IDEHandler = value;
        }
    }
});
