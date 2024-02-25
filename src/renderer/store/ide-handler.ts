import { defineStore } from "pinia";

export const useIDEHandler = defineStore("ide-handler", {
    state: () => {
        return {
            value: "phpstorm://open?file={filepath}&line={line}"
        };
    }
});
