import { defineStore } from 'pinia';
import { LivewirePayload } from '@/types/Payload';

export type Livewire = {
    name: string;
    size: string;
    request: string;
    errors: Array<any>;
    properties: Array<any>;
    profile: Array<any>;
    queries: Array<any>;
    events: Array<any>;
    original_content?: string;
};

export const useLivewireStore = defineStore('livewire', {
    state: () => ({
        requests: [] as Livewire[]
    }),
    actions: {
        add(object: LivewirePayload) {
            const livewireData: Livewire = {
                ...object,
                original_content: object.original_content
            };
            this.requests.push(livewireData);
        },
        clear() {
            this.requests = [];
        }
    }
});
