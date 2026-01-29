import { defineStore } from 'pinia';

type State = {
    is_paused: boolean;
};

export const usePauseLogsStore = defineStore('pauseLogs', {
    state: (): State => ({
        is_paused: false
    }),
    actions: {
        toggle() {
            this.is_paused = !this.is_paused;
        }
    }
});
