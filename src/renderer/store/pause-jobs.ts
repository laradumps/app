import { defineStore } from 'pinia';

type State = {
    is_paused: boolean;
};

export const usePauseJobsStore = defineStore('pauseJobs', {
    state: (): State => ({
        is_paused: false
    }),
    actions: {
        setPause(value: boolean) {
            this.is_paused = value;
        },
        toggle() {
            this.is_paused = !this.is_paused;
        }
    }
});
