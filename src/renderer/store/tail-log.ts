import { defineStore } from 'pinia';
import { Log } from '@/store/logs';

const MAX_TAIL_ENTRIES = 2000;
const PAGE_SIZE = 25;
const MAX_LOADED_PAGES = 5;
const MAX_BUFFERED_PAGES = 5;

export type TailMeta = {
    filePath?: string;
    size?: number;
    truncated?: boolean;
    watching?: boolean;
    exists?: boolean;
};

export type TailError = {
    code: string;
    message: string;
};

export type DiscoveredLogFile = {
    path: string;
    name: string;
    dir: string;
    size: number;
    mtimeMs: number;
};

type State = {
    entries: Record<string, Log>;
    incoming: Record<string, Log>;
    filePath: string;
    watching: boolean;
    truncated: boolean;
    error: TailError | null;
    availableFiles: DiscoveredLogFile[];
    loadingFiles: boolean;
};

const trim = (items: Record<string, Log>, max: number) => {
    const keys = Object.keys(items);
    if (keys.length <= max) {
        return;
    }

    keys.sort((a, b) => new Date(items[a].created_at).getTime() - new Date(items[b].created_at).getTime());

    const toRemove = keys.length - max;
    for (let i = 0; i < toRemove; i++) {
        delete items[keys[i]];
    }
};

export const useTailLogStore = defineStore('tailLogStore', {
    state: (): State => ({
        entries: {},
        incoming: {},
        filePath: '',
        watching: false,
        truncated: false,
        error: null,
        availableFiles: [],
        loadingFiles: false
    }),
    getters: {
        pageSize(): number {
            return PAGE_SIZE;
        },
        incomingCount(): number {
            return Object.keys(this.incoming).length;
        },
        maxItems(): number {
            return PAGE_SIZE * MAX_LOADED_PAGES;
        }
    },
    actions: {
        addBatch(items: Log[]) {
            if (!items || items.length === 0) {
                return;
            }

            for (const entry of items) {
                if (entry && entry.log_id) {
                    const bucket = this.entries[entry.log_id]
                        ? this.entries
                        : this.incoming[entry.log_id]
                          ? this.incoming
                          : this._bucketForNewEntry();

                    bucket[entry.log_id] = entry;

                    if (bucket === this.incoming) {
                        trim(this.incoming, this.pageSize * MAX_BUFFERED_PAGES);
                    }
                }
            }

            this._enforceLimit();
        },
        _bucketForNewEntry(): Record<string, Log> {
            return Object.keys(this.entries).length >= this.pageSize ? this.incoming : this.entries;
        },
        loadIncoming(loadAll = false) {
            const values = Object.values(this.incoming).sort(
                (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
            const page = loadAll ? values : values.slice(0, this.pageSize);

            for (const entry of page) {
                this.entries[entry.log_id] = entry;
                delete this.incoming[entry.log_id];
            }

            this._enforceLimit();
        },
        recycle(maxItems: number, dropIncoming = false) {
            if (dropIncoming) {
                this.incoming = {};
            }
            trim(this.entries, maxItems);
        },
        clear() {
            this.entries = {};
            this.incoming = {};
        },
        clearAll() {
            this.entries = {};
            this.incoming = {};
            this.filePath = '';
            this.watching = false;
            this.availableFiles = [];
            this.error = null;
        },
        reset() {
            this.entries = {};
            this.incoming = {};
        },
        setMeta(meta: TailMeta) {
            if (meta.filePath !== undefined) this.filePath = meta.filePath;
            if (meta.watching !== undefined) this.watching = meta.watching;
            if (meta.truncated !== undefined) this.truncated = meta.truncated;
            if (meta.exists) this.error = null;
        },
        setError(error: TailError) {
            this.error = error;
        },
        async refreshFiles(projectPath?: string) {
            this.loadingFiles = true;
            try {
                const files = await window.ipcRenderer.invoke('tail-log:list-files', { projectPath });
                this.availableFiles = Array.isArray(files) ? files : [];
            } catch {
                this.availableFiles = [];
            } finally {
                this.loadingFiles = false;
            }
        },
        _enforceLimit() {
            const keys = Object.keys(this.entries);
            if (keys.length <= MAX_TAIL_ENTRIES) {
                return;
            }

            keys.sort((a, b) => (parseInt(a.slice(5), 10) || 0) - (parseInt(b.slice(5), 10) || 0));

            const toRemove = keys.length - MAX_TAIL_ENTRIES;
            for (let i = 0; i < toRemove; i++) {
                delete this.entries[keys[i]];
            }
        }
    }
});
