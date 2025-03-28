import { defineStore } from "pinia";

type Current = {
    is_paused: boolean;
};

export const usePausePayloadStore = defineStore("pausePayload", {
    state: (): Current => ({
        is_paused: false
    }),
    actions: {
        toggle() {
            this.is_paused = !this.is_paused;
        }
    }
});
