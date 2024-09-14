import { defineStore } from "pinia";
import { ScreenPayload } from "@/types/Payload";

type State = {
    screen: string;
    screens: [];
    pinned?: string | null;
};

export const useScreenStore = defineStore("screen", {
    state: (): State => ({
        screen: "",
        screens: []
    }),
    actions: {
        activeScreen(value: string) {
            this.screen = value;
        },
        add(screen: ScreenPayload) {
            const exists = this.screens.filter((screenPayload: ScreenPayload) => screen.screen_name === screenPayload.screen_name).length > 0;

            if (!exists) {
                this.screens.push(screen);
            }
        },
        clearAll() {
            this.screens = [];
        },
        allVisible() {
            return this.screens.filter((screen: ScreenPayload) => screen.visible);
        },
        all() {
            return this.screens;
        },
        get(screen: String) {
            return this.screens.filter((screenPayload: ScreenPayload) => {
                return screenPayload.screen_name === screen;
            })[0];
        },
        toggleVisible(screenName: String) {
            this.screens = this.screens.map((screen: ScreenPayload) => {
                if (screen.screen_name === screenName) {
                    return { ...screen, visible: !screen.visible };
                }
                return screen;
            });
        },
        getNext(screenName: string) {
            const index = this.screens.findIndex((screen) => screen.screen_name === screenName);
            if (index === -1) return null;

            const nextIndex = (index + 1) % this.screens.length;
            return this.screens[nextIndex];
        }
    },
    persist: {
        enabled: true
    }
});
