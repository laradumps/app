import { defineStore } from 'pinia';
import { ScreenPayload } from '@/types/Payload';

type State = {
    screen: string;
    screens: ScreenPayload[];
    pinned: string;
};

export const useScreenStore = defineStore('screen', {
    state: (): State => ({
        screen: 'home',
        screens: [],
        pinned: ''
    }),
    actions: {
        activeScreen(value: string) {
            this.screen = value;
        },
        remove(screenName: string) {
            this.screens = this.screens.filter(
                (screenPayload: ScreenPayload) => screenPayload.screen_name !== screenName
            );
        },
        pin(screen: string) {
            this.screens = this.screens.map((screenPayload: ScreenPayload) => ({
                ...screenPayload,
                pinned: screenPayload.screen_name === screen && screen !== this.pinned
            }));
            this.pinned = screen;
        },
        add(screen: ScreenPayload) {
            const exists = this.screens.some(
                (screenPayload: ScreenPayload) => screenPayload.screen_name === screen.screen_name
            );

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
        get(screenName: string) {
            return (
                this.screens.find((screenPayload: ScreenPayload) => screenPayload.screen_name === screenName) || null
            );
        },
        toggleVisible(screenName: string) {
            this.screens = this.screens.map((screen: ScreenPayload) => {
                if (screen.screen_name === screenName) {
                    return { ...screen, visible: !screen.visible };
                }
                return screen;
            });
        },
        hidden(screenName: string) {
            this.screens = this.screens.map((screen: ScreenPayload) => {
                if (screen.screen_name === screenName) {
                    return { ...screen, visible: false };
                }
                return screen;
            });
        },
        getNext(screenName: string) {
            const index = this.screens.findIndex((screen: ScreenPayload) => screen.screen_name === screenName);
            if (index === -1) return null;

            const nextIndex = (index + 1) % this.screens.length;
            return this.screens[nextIndex] || null;
        }
    }
});
