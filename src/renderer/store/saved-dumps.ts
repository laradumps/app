import { defineStore } from 'pinia';
import { Payload } from '@/types/Payload';

const STORAGE_KEY = 'laradumps:saved_dumps';

function loadFromStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        return JSON.parse(raw);
    } catch (e) {
        console.error('Failed to load saved dumps from storage', e);
        return [];
    }
}

function saveToStorage(items: Payload[]) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
        console.error('Failed to save dumps to storage', e);
    }
}

export const useSavedDumpsStore = defineStore('savedDumps', {
    state: () => ({
        items: loadFromStorage()
    }),
    getters: {
        count: (state) => state.items.length,
        all: (state) => state.items
    },
    actions: {
        exists(id: string) {
            return this.items.some((payload: Payload) => payload.id === id);
        },
        add(payload: any) {
            if (this.exists(payload.id)) return;
            this.items.push(payload);
            saveToStorage(this.items);
        },
        remove(id: string) {
            this.items = this.items.filter((payload: Payload) => payload.id !== id);
            saveToStorage(this.items);
        },
        clear() {
            this.items = [];
            saveToStorage(this.items);
        }
    }
});
