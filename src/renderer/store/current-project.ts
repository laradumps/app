import { defineStore } from "pinia";

export const useCurrentProject = defineStore("currentProject", {
    state: () => {
        return {
            value: localStorage.currentProject
        };
    },
    actions: {
        set(value: string) {
            localStorage.currentProject = value;
            this.value = value;
        },
        remove() {
            localStorage.removeItem("currentProject");
            this.value = null;
        }
    }
});
