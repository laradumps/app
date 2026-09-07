import { defineStore } from 'pinia';
import { ScreenPayload } from '@/types/Payload';

export type Screen = ScreenPayload & {
    original_content?: string;
};

type State = {
    screen: string;
    screens: Screen[];
    pinned: string;
    detached: string[];
};

export const useScreenStore = defineStore('screen', {
    state: (): State => ({
        screen: 'home',
        screens: [],
        pinned: '',
        detached: []
    }),
    actions: {
        markDetached(screenName: string) {
            if (!this.detached.includes(screenName)) {
                this.detached.push(screenName);
            }
        },
        unmarkDetached(screenName: string) {
            this.detached = this.detached.filter((name) => name !== screenName);
        },
        hasDetachedWindow(screenName: string): boolean {
            return this.detached.includes(screenName);
        },
        activeScreen(value: string) {
            this.screen = value;
        },
        remove(screenName: string) {
            this.screens = this.screens.filter((screenPayload) => screenPayload.screen_name !== screenName);
        },
        pin(screen: string) {
            this.screens = this.screens.map((screenPayload) => ({
                ...screenPayload,
                pinned: screenPayload.screen_name === screen && screen !== this.pinned
            }));
            this.pinned = screen;
        },
        add(screen: ScreenPayload) {
            const exists = this.screens.some((screenPayload) => screenPayload.screen_name === screen.screen_name);

            if (!exists) {
                const screenData: Screen = {
                    ...screen,
                    original_content: screen.original_content
                };

                if (screen.screen_name === 'home') {
                    this.screens.unshift(screenData);
                    return;
                }

                this.screens.push(screenData);
            }
        },
        clearAll() {
            this.screens = [];
            this.screen = 'home';
            this.detached = [];
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
