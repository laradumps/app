import { defineStore } from "pinia";

export const useIDEHandlerStore = defineStore("ide-handler", {
    state: () => {
        return {
            value: "phpstorm://open?file={filepath}&line={line}"
        };
    },
    actions: {
        setValue(value: string) {
            this.value = value;
            localStorage.IDEHandler = value
        }
    }
});
