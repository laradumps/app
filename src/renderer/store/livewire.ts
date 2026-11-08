import { defineStore } from 'pinia';
import { useSettingsStore } from '@/store/settings';
import type { Payload } from '@/types/Payload';

export type LivewireTiming = { kind: string; label: string; ms: number };

export type LivewireComponent = {
    id: string;
    name: string;
    action: 'update' | 'mount';
    updates: Record<string, unknown>;
    calls: { method: string; params: unknown[] }[];
    changes: Record<string, [unknown, unknown]>;
    state: Record<string, unknown> | null;
    errors: Record<string, string[]>;
    dispatches: { name: string; params?: unknown }[];
    queries: { sql: string; bindings?: unknown[]; time?: number; connectionName?: string; driver?: string }[];
    profile: LivewireTiming[];
    size: number | string;
    legacy?: { state?: string; errors?: string };
};

export type LivewireRequest = { id: string; sent_at: number | null; components: LivewireComponent[] };

const blank: Omit<LivewireComponent, 'id' | 'name'> = {
    action: 'update',
    updates: {},
    calls: [],
    changes: {},
    state: null,
    errors: {},
    dispatches: [],
    queries: [],
    profile: [],
    size: 0
};

const kindOf = (method: string) =>
    ['mount', 'hydrate', 'render', 'dehydrate'].includes(method)
        ? method
        : method.startsWith('child:')
          ? 'child'
          : 'call';

const fromLegacy = (old: any): LivewireComponent => ({
    ...blank,
    id: old.id ?? old.request ?? '',
    name: old.name ?? '',
    dispatches: old.events ?? [],
    queries: old.queries ?? [],
    profile: Object.values(old.profile ?? {})
        .filter((p: any) => p?.method)
        .map((p: any) => ({ kind: kindOf(p.method), label: p.method, ms: Number(p.duration) || 0 })),
    size: old.size ?? 0,
    legacy: { state: old.properties?.[0], errors: old.errors?.[0] }
});

export const useLivewireStore = defineStore('livewire', {
    state: () => ({
        requests: [] as LivewireRequest[],
        focus: [] as string[]
    }),
    actions: {
        add(payload: Payload) {
            const livewire: any = payload.livewire;
            if (!livewire) return;

            if (Array.isArray(livewire.focus)) {
                this.focus = livewire.focus;
                return;
            }

            const components = Array.isArray(livewire.components)
                ? livewire.components.map((c: Partial<LivewireComponent>) => ({ ...blank, ...c }))
                : [fromLegacy(livewire)];

            if (!components.length) return;

            this.requests.push({
                id: payload.id ?? `${Date.now()}`,
                sent_at: payload.sent_at ?? null,
                components
            });

            const limit = useSettingsStore().settings.limit_dumps || 500;
            if (this.requests.length > limit) this.requests.splice(0, this.requests.length - limit);
        },
        toggleFocus(name: string) {
            this.focus = this.focus.includes(name) ? this.focus.filter((n) => n !== name) : [...this.focus, name];
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
