import { defineStore } from "pinia";

type State = {
    screen: string;
    pinned?: string | null;
};

export const useScreenStore = defineStore("screen", {
    state: (): State => ({
        screen: "",
        pinned: ""
    }),
    actions: {
        activeScreen(value: string, pinned = false) {
            this.screen = value;

            if (pinned) {
                if (value === this.pinned) {
                    this.pinned = null;
                } else {
                    this.pinned = value;
                }
            }
        }
    }
});
