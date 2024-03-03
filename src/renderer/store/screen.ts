import { defineStore } from "pinia";

type State = {
    screen: string;
    pinned?: string | null;
};

export const useScreenStore = defineStore("screen", {
    state: (): State => ({
        screen: ""
    }),
    actions: {
        activeScreen(value: string) {
            this.screen = value;
        }
    }
});
