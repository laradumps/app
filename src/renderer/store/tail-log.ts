import { defineStore } from 'pinia';
import { Log } from '@/store/logs';

const MAX_TAIL_ENTRIES = 2000;

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
    filePath: string;
    watching: boolean;
    truncated: boolean;
    error: TailError | null;
    availableFiles: DiscoveredLogFile[];
    loadingFiles: boolean;
};

export const useTailLogStore = defineStore('tailLogStore', {
    state: (): State => ({
        entries: {},
        filePath: '',
        watching: false,
        truncated: false,
        error: null,
        availableFiles: [],
        loadingFiles: false
    }),
    actions: {
        addBatch(items: Log[]) {
            if (!items || items.length === 0) {
                return;
            }

            for (const entry of items) {
                if (entry && entry.log_id) {
                    this.entries[entry.log_id] = entry;
                }
            }

            this._enforceLimit();
        },
        clear() {
            this.entries = {};
        },
        clearAll() {
            this.entries = {};
            this.filePath = '';
            this.watching = false;
            this.availableFiles = [];
            this.error = null;
        },
        reset() {
            this.entries = {};
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
