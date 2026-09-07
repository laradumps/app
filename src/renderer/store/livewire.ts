import { defineStore } from 'pinia';
import { LivewirePayload } from '@/types/Payload';
import { useSettingsStore } from '@/store/settings';

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

            const limit = useSettingsStore().settings.limit_dumps || 500;
            if (this.requests.length >= limit) {
                this.requests.shift();
            }

            this.requests.push(livewireData);
        },
        clear() {
            this.requests = [];
        },
        recycle(maxItems: number) {
            if (this.requests.length > maxItems) {
                this.requests.splice(0, this.requests.length - maxItems);
            }
        }
    }
});
