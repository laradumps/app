import { defineStore } from "pinia";

type State = {
    value: string;
};

export const useIDEHandlerStore = defineStore("ide-handler", {
    state: (): State => ({
        value: ""
    }),
    actions: {
        setValue(value: string) {
            this.value = value;
            localStorage.IDEHandler = value;
        }
    }
});
