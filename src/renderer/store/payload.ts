import { defineStore } from "pinia";
import { Payload } from "@/types/Payload";

type State = {
    payload: Payload[];
};

export const usePayloadStore = defineStore("payload", {
    state: (): State => ({
        payload: []
    }),
    actions: {
        add(object: Payload) {
            this.payload.push(object);
        },
        get(screen: String) {
            return this.payload.filter((payload: Payload) => payload.screen?.screen_name === screen);
        },
        clear(screen: String) {
            this.payload = this.payload.filter((payload: Payload) => payload.screen?.screen_name !== screen);
        },
        clearAll() {
            this.payload = [];
        }
    },
    persist: {
        enabled: true
    }
});
