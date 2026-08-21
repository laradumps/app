import { defineStore } from 'pinia';

type State = {
    is_paused: boolean;
};

function createPauseStore(id: string) {
    return defineStore(id, {
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
}

export const usePausePayloadStore = createPauseStore('pausePayload');
export const usePauseLogsStore = createPauseStore('pauseLogs');
export const usePauseJobsStore = createPauseStore('pauseJobs');
export const usePauseQueriesStore = createPauseStore('pauseQueries');
export const usePauseProfileStore = createPauseStore('pauseProfile');
