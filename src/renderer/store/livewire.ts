import { defineStore } from "pinia";
import { LivewirePayload } from "@/types/Payload";

export const useLivewireStore = defineStore("livewire", {
    state: () => ({
        requests: [] as LivewirePayload[]
    }),
    actions: {
        add(object: LivewirePayload) {
            this.requests.push(object);
        },
        clear() {
            this.requests = [];
        }
    }
});
