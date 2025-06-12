import { defineStore } from "pinia";
import { Payload } from "@/types/Payload";

export const useLivewireStore = defineStore("livewire", {
    state: () => ({
        payload: [] as Payload[]
    }),
    actions: {
        add(object: Payload) {
            this.payload.push(object);
        },
        get(screen: String) {
            return this.payload.filter((payload) => payload.to_screen.screen_name === screen);
        },
        clear() {
            this.payload = [];
        }
    }
});
