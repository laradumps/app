import { defineStore } from 'pinia';

let counter = 0;

type ToastType = 'info' | 'success' | 'error' | 'warning';

interface Toast {
    id: number;
    message: string;
    type: ToastType;
    timeout: number;
}

export const useToastStore = defineStore('toast', {
    state: (): { toasts: Toast[] } => ({
        toasts: []
    }),
    getters: {
        all: (state) => state.toasts
    },
    actions: {
        show(message: string, type: ToastType = 'info', timeout?: number): number {
            const id = ++counter;
            timeout ??= type === 'error' ? 6000 : 2000;
            this.toasts.push({ id, message, type, timeout });
            if (timeout > 0) {
                setTimeout(() => this.hide(id), timeout);
            }
            return id;
        },
        hide(id: number) {
            this.toasts = this.toasts.filter((t) => t.id !== id);
        },
        clear() {
            this.toasts = [];
        }
    }
});
