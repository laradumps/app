<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useProfileStore, type Profile, type ProfileEntry } from '@/store/profile';
import { TrashIcon, ArrowsRightLeftIcon } from '@heroicons/vue/24/outline';
import SvgEmpty from '@/components/svg/SvgEmpty.vue';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const profileStore = useProfileStore();

const props = defineProps<{
    inScreenWindow?: boolean;
}>();

const selectedEntry = ref<ProfileEntry | null>(null);
const hoveredEntry = ref<string | null>(null);

watch(selectedEntry, (newVal) => {
    const modal = document.getElementById('profile_entry_modal') as HTMLDialogElement;
    if (modal) {
        if (newVal) {
            modal.showModal();
        } else {
            modal.close();
        }
    }
});

const typeColors: Record<string, string> = {
    app: 'bg-blue-600',
    event: 'bg-green-400',
    sql: 'bg-orange-500',
    eloquent: 'bg-orange-400',
    view: 'bg-emerald-600',
    controller: 'bg-cyan-500',
    http: 'bg-purple-500',
    cache: 'bg-yellow-500',
    job: 'bg-pink-500',
    method: 'bg-blue-500'
};

const entryBarColor = (entry: ProfileEntry): string => {
    if (entry.type === 'app' && (entry.name === 'app(start)' || entry.name === 'app(end)')) {
        return 'bg-base-content/20';
    }
    return `${typeColors[entry.type]} hover:opacity-80`;
};

const legendDotColor = (type: string): string => {
    if (type === 'app') return 'bg-base-content/20';
    return typeColors[type] || 'bg-gray-400';
};

const typeLabels: Record<string, string> = {
    app: 'App',
    event: 'Events',
    sql: 'SQL',
    eloquent: 'Eloquent',
    view: 'View',
    controller: 'Controller',
    http: 'HTTP',
    cache: 'Cache',
    job: 'Jobs',
    method: 'Method'
};

const selectedProfile = computed(() => profileStore.selectedProfile);
const profiles = computed(() => profileStore.profileList);

// Types currently hidden from the timeline
const hiddenTypes = ref<Set<string>>(new Set());

const toggleType = (type: string) => {
    const next = new Set(hiddenTypes.value);
    if (next.has(type)) {
        next.delete(type);
    } else {
        next.add(type);
    }
    hiddenTypes.value = next;
};

// Reset filters when profile changes
watch(selectedProfile, () => {
    hiddenTypes.value = new Set();
});

const timelineScale = computed(() => {
    if (!selectedProfile.value) return { max: 100, step: 10 };
    const max = selectedProfile.value.total_duration_ms;
    const step = Math.ceil(max / 10);
    return { max: max > 0 ? max : 100, step: step || 10 };
});

const timeMarkers = computed(() => {
    const { max, step } = timelineScale.value;
    const markers = [];
    for (let i = 0; i <= max; i += step) {
        markers.push(Math.round(i));
    }
    return markers;
});

const getBarStyle = (entry: ProfileEntry) => {
    if (!selectedProfile.value) return {};
    const totalMs = selectedProfile.value.total_duration_ms;
    const startPercent = (entry.start_ms / totalMs) * 100;
    const duration = entry.duration_ms ?? 0;
    const minWidth = entry.duration_ms === null ? 1.5 : 0.3;
    const widthPercent = Math.max((duration / totalMs) * 100, minWidth);
    const endPercent = startPercent + widthPercent;
    const adjustedWidth = endPercent > 100 ? 100 - startPercent : widthPercent;
    return {
        left: `${Math.min(startPercent, 100)}%`,
        width: `${Math.max(adjustedWidth, minWidth)}%`
    };
};

const formatDuration = (ms: number | null): string => {
    if (ms === null) return '-';
    if (ms < 1) return `${(ms * 1000).toFixed(0)}µs`;
    if (ms < 1000) return `${ms.toFixed(2)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
};

const sortedEntries = computed(() => {
    if (!selectedProfile.value) return [];
    return [...selectedProfile.value.entries]
        .filter((e) => !hiddenTypes.value.has(e.type))
        .sort((a, b) => a.start_ms - b.start_ms);
});

// Build a depth map for all entries using parent_id relationships.
// Depth 0 = root (no parent or parent filtered out).
const entryDepthMap = computed((): Map<string, number> => {
    if (!selectedProfile.value) return new Map();

    // Index all entries by id (use the full unfiltered list so parent refs resolve)
    const allById = new Map<string, ProfileEntry>();
    for (const e of selectedProfile.value.entries) {
        allById.set(e.id, e);
    }

    const depthMap = new Map<string, number>();

    const getDepth = (id: string, visited = new Set<string>()): number => {
        if (depthMap.has(id)) return depthMap.get(id)!;
        if (visited.has(id)) return 0; // cycle guard
        visited.add(id);

        const entry = allById.get(id);
        if (!entry || !entry.parent_id) {
            depthMap.set(id, 0);
            return 0;
        }

        const parentDepth = getDepth(entry.parent_id, visited);
        const depth = parentDepth + 1;
        depthMap.set(id, depth);
        return depth;
    };

    for (const e of selectedProfile.value.entries) {
        getDepth(e.id);
    }

    return depthMap;
});

// Extract the separator and parts from a XHProf function string.
// e.g. "App\Models\Campaign::bootSoftDeletes" → sep="::", class="App\Models\Campaign", method="bootSoftDeletes"
const parseFn = (fn: string): { sep: string; className: string; method: string } | null => {
    const sep = fn.includes('::') ? '::' : fn.includes('->') ? '->' : null;
    if (!sep) return null;
    const idx = fn.indexOf(sep);
    return { sep, className: fn.slice(0, idx), method: fn.slice(idx + sep.length) };
};

// Short class name (last segment after \)
const shortClass = (className: string): string => className.split('\\').pop() ?? className;

// Short method name: strip any namespace inside the method part (e.g. closures like App\...\{closure})
const shortMethod = (method: string): string => method.split('\\').pop() ?? method;

// Full label shown in the row when NOT inside a class group (standalone method or non-method entry)
const entryLabel = (entry: ProfileEntry): string => {
    if (entry.type === 'method' && entry.metadata?.function) {
        const parsed = parseFn(entry.metadata.function as string);
        if (parsed) {
            return `${shortClass(parsed.className)}${parsed.sep}${shortMethod(parsed.method)}`;
        }
    }
    return entry.name;
};

// Extract class name from a method entry (for grouping header)
const entryClass = (entry: ProfileEntry): string | null => {
    if (entry.type !== 'method' || !entry.metadata?.function) return null;
    const parsed = parseFn(entry.metadata.function as string);
    return parsed ? shortClass(parsed.className) : null;
};

// Label shown when inside a class group — only the method name, no class prefix
const entryMethodName = (entry: ProfileEntry): string => {
    if (entry.type === 'method' && entry.metadata?.function) {
        const parsed = parseFn(entry.metadata.function as string);
        if (parsed) return shortMethod(parsed.method);
    }
    return entry.name;
};

// Build grouped timeline: non-method entries stay flat; method entries are
// grouped under a class header (inserted at first occurrence). Strict
// chronological order is preserved — the header is injected right before the
// first method of each new class.
type TimelineGroup =
    | {
          type: 'entry';
          entry: ProfileEntry;
          indented: boolean;
          depth: number;
          connectors: string[]; // one per depth level: '│', '├', '└', or ' '
      }
    | {
          type: 'class-header';
          className: string;
          totalDurationMs: number;
          count: number;
          depth: number;
          connectors: string[];
      };

// Helper: get the depth of any timeline item
const itemDepth = (item: TimelineGroup): number => {
    if (item.type === 'class-header') return item.depth;
    return item.depth;
};

const timelineItems = computed((): TimelineGroup[] => {
    const items: TimelineGroup[] = [];

    // Build contiguous run segments: consecutive method entries from the same
    // class form a "run". Pre-scan to compute total duration per run.
    // Structure: array of { cls, entries[] } representing contiguous runs.
    type Run = { cls: string; entries: ProfileEntry[] };
    const runs: Run[] = [];
    for (const entry of sortedEntries.value) {
        if (entry.type !== 'method') continue;
        const cls = entryClass(entry);
        if (!cls) continue;
        const last = runs[runs.length - 1];
        if (last && last.cls === cls) {
            last.entries.push(entry);
        } else {
            runs.push({ cls, entries: [entry] });
        }
    }
    // Map from run index to total duration for that run
    const runDuration = runs.map((r) => r.entries.reduce((sum, e) => sum + (e.duration_ms ?? 0), 0));
    // Map entry id → run index (for O(1) lookup per entry)
    const entryRunIndex = new Map<string, number>();
    runs.forEach((r, i) => r.entries.forEach((e) => entryRunIndex.set(e.id, i)));

    // Min raw depth per run (used for class header depth)
    const runMinDepth = runs.map((r) => {
        const depths = r.entries.map((e) => entryDepthMap.value.get(e.id) ?? 0);
        return Math.min(...depths);
    });

    let lastRunIdx = -1;

    for (const entry of sortedEntries.value) {
        if (entry.type !== 'method') {
            lastRunIdx = -1;
            const rawDepth = entryDepthMap.value.get(entry.id) ?? 0;
            items.push({ type: 'entry', entry, indented: false, depth: rawDepth, connectors: [] });
            continue;
        }
        const cls = entryClass(entry);
        if (!cls) {
            lastRunIdx = -1;
            const rawDepth = entryDepthMap.value.get(entry.id) ?? 0;
            items.push({ type: 'entry', entry, indented: false, depth: rawDepth, connectors: [] });
            continue;
        }
        const runIdx = entryRunIndex.get(entry.id) ?? -1;
        const isMultiEntryRun = runIdx >= 0 && runs[runIdx].entries.length > 1;
        // Only inject a class header when the run has multiple entries.
        // Single-entry runs show the full class::method label directly,
        // avoiding redundant headers that duplicate the entry's duration.
        if (runIdx !== lastRunIdx) {
            lastRunIdx = runIdx;
            if (isMultiEntryRun) {
                const headerDepth = runMinDepth[runIdx];
                items.push({
                    type: 'class-header',
                    className: cls,
                    totalDurationMs: runDuration[runIdx],
                    count: runs[runIdx].entries.length,
                    depth: headerDepth,
                    connectors: []
                });
            }
        }
        const rawDepth = entryDepthMap.value.get(entry.id) ?? 0;
        items.push({ type: 'entry', entry, indented: isMultiEntryRun, depth: rawDepth, connectors: [] });
    }

    // Second pass: compute tree connectors for ALL items (headers + entries)
    // using a global standard tree algorithm.
    // For each item at depth D > 0, compute connectors for columns 1..D.
    // Column c: look ahead for a future item at depth == c with no item at depth < c in between.
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const D = itemDepth(item);
        if (D === 0) continue;

        const connectors: string[] = [];
        for (let c = 1; c <= D; c++) {
            // Look ahead: is there a future item at depth >= c
            // before we encounter an item at depth < c?
            let hasFuture = false;
            for (let j = i + 1; j < items.length; j++) {
                const futureD = itemDepth(items[j]);
                if (futureD < c) break; // exited this subtree level
                if (futureD >= c) {
                    if (c < D) {
                        // Ancestor column: any future item at this depth or deeper means continuation
                        hasFuture = true;
                        break;
                    } else {
                        // Own depth column: need exact match
                        if (futureD === c) {
                            hasFuture = true;
                            break;
                        }
                        // futureD > c means it's a child, keep looking
                    }
                }
            }

            if (c < D) {
                connectors.push(hasFuture ? '│' : ' ');
            } else {
                connectors.push(hasFuture ? '├' : '└');
            }
        }

        if (item.type === 'class-header') {
            item.connectors = connectors;
        } else {
            item.connectors = connectors;
        }
    }
    return items;
});

const clear = () => {
    profileStore.clear();
};

const selectProfile = (id: string) => {
    profileStore.selectProfile(id);
    const modal = document.getElementById('profile_selector_dialog') as HTMLDialogElement;
    if (modal) modal.close();
};

const openProfilesModal = () => {
    const modal = document.getElementById('profile_selector_dialog') as HTMLDialogElement;
    if (modal) modal.showModal();
};
</script>

<template>
    <div
        :class="inScreenWindow ? 'h-[calc(100vh-100px)]' : 'h-[calc(100vh-140px)]'"
        class="flex flex-col"
    >
        <!-- Actions Bar -->
        <div class="-mt-3 flex items-center justify-between w-full border-b border-base-content/10 h-9 px-3">
            <span class="text-[10px] font-bold uppercase tracking-widest text-base-content/70 select-none"
                >Profile</span
            >
            <div class="flex items-center gap-1">
                <button
                    v-if="profiles.length > 0"
                    @click="clear"
                    class="btn btn-ghost btn-circle btn-sm text-error/70 hover:text-error"
                    data-tippy-content="Clear"
                >
                    <TrashIcon class="w-4" />
                </button>
            </div>
        </div>

        <!-- Profile Content -->
        <div
            v-if="profiles.length > 0 && selectedProfile"
            class="flex-1 flex flex-col overflow-hidden min-h-0"
        >
            <!-- Selector bar (same style as queries view) -->
            <div class="shrink-0 flex justify-between items-center gap-3 px-3 h-10 border-b border-base-content/10">
                <!-- Pill: open profile selector modal -->
                <button
                    class="max-w-1/2 btn btn-soft bg-base-100 btn-sm text-xs font-normal p-2 pr-3 rounded-full"
                    @click="openProfilesModal"
                >
                    <ArrowsRightLeftIcon class="w-4 inline-block" />
                    <span class="opacity-80"> ({{ profiles.length }}) </span>
                    <span class="truncate">{{ selectedProfile.label }}</span>
                </button>

                <!-- Right badges -->
                <div class="flex items-center gap-2">
                    <div class="badge badge-ghost badge-sm font-mono">
                        {{ selectedProfile.summary.total_entries }} entries
                    </div>
                    <div class="badge badge-primary badge-sm font-mono">
                        {{ formatDuration(selectedProfile.total_duration_ms) }}
                    </div>
                </div>
            </div>

            <!-- Legend filters (fixed) -->
            <div class="shrink-0 px-3 py-2 border-b border-base-content/10">
                <div class="flex flex-wrap gap-1.5">
                    <button
                        v-for="(data, type) in selectedProfile.summary.by_type"
                        :key="type"
                        @click="toggleType(type as string)"
                        class="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded transition-all select-none"
                        :class="[
                            hiddenTypes.has(type as string) ? 'opacity-40 line-through' : 'opacity-100',
                            'hover:bg-base-content/10 cursor-pointer'
                        ]"
                        :title="
                            hiddenTypes.has(type as string)
                                ? `Show ${typeLabels[type] || type}`
                                : `Hide ${typeLabels[type] || type}`
                        "
                    >
                        <span
                            class="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            :class="legendDotColor(type as string)"
                        ></span>
                        <span>{{ typeLabels[type as string] || type }} ({{ data.count }})</span>
                    </button>
                </div>
            </div>

            <!-- Time scale ruler (fixed, outside scroll area) -->
            <div class="shrink-0 relative h-7 border-b border-base-content/20 bg-base-100 px-3">
                <div class="absolute inset-0 flex">
                    <div class="w-52 flex-shrink-0"></div>
                    <div class="flex-1 relative">
                        <div
                            v-for="marker in timeMarkers"
                            :key="marker"
                            class="absolute text-[9px] text-base-content/40 transform -translate-x-1/2 top-1/2 -translate-y-1/2"
                            :style="{ left: `${(marker / timelineScale.max) * 100}%` }"
                        >
                            {{ marker }}ms
                        </div>
                    </div>
                    <div class="w-20 flex-shrink-0"></div>
                </div>
            </div>

            <!-- Scrollable timeline area -->
            <div class="flex-1 overflow-auto min-h-0 px-3 py-2">
                <!-- Timeline entries -->
                <div>
                    <template
                        v-for="(item, idx) in timelineItems"
                        :key="idx"
                    >
                        <!-- Class group header -->
                        <div
                            v-if="item.type === 'class-header'"
                            class="flex items-center first:mt-0"
                        >
                            <div class="w-52 pr-2 flex-shrink-0 flex items-center">
                                <!-- Tree connectors for header -->
                                <template v-if="item.depth > 0">
                                    <span
                                        v-for="(c, ci) in item.connectors"
                                        :key="ci"
                                        class="tree-connector flex-shrink-0 select-none text-base-content/20"
                                        :class="{
                                            'tree-vline': c === '│',
                                            'tree-fork': c === '├',
                                            'tree-corner': c === '└',
                                            'tree-space': c === ' '
                                        }"
                                    ></span>
                                </template>
                                <span class="flex-1 text-[11px] tracking-widest text-base-content/40 select-none">
                                    {{ item.className }}
                                </span>
                            </div>
                            <div class="flex-1 border-t border-base-content/10"></div>
                            <div class="w-20 pl-2 text-[10px] text-base-content/30 shrink-0 text-right">
                                {{ formatDuration(item.totalDurationMs) }}
                            </div>
                        </div>

                        <!-- Entry row -->
                        <div
                            v-else-if="item.type === 'entry'"
                            class="flex items-center group rounded cursor-pointer transition-colors"
                            @click="selectedEntry = item.entry"
                        >
                            <!-- Label: fixed width area; depth tree indent on the left, text right-aligned -->
                            <div
                                class="w-52 pr-2 text-xs text-base-content/70 flex-shrink-0 leading-tight flex items-center"
                            >
                                <!-- Tree connectors -->
                                <template v-if="item.depth > 0">
                                    <span
                                        v-for="(c, ci) in item.connectors"
                                        :key="ci"
                                        class="tree-connector flex-shrink-0 select-none text-base-content/20"
                                        :class="{
                                            'tree-vline': c === '│',
                                            'tree-fork': c === '├',
                                            'tree-corner': c === '└',
                                            'tree-space': c === ' '
                                        }"
                                    ></span>
                                </template>
                                <!-- Method name, right-fill remaining space -->
                                <span class="flex-1 text-left break-all truncate">{{
                                    item.indented ? entryMethodName(item.entry) : entryLabel(item.entry)
                                }}</span>
                            </div>

                            <!-- Bar container -->
                            <div class="flex-1 relative h-5 bg-base-200/50 rounded overflow-hidden">
                                <div
                                    class="absolute h-full rounded transition-opacity"
                                    :class="entryBarColor(item.entry)"
                                    :style="getBarStyle(item.entry)"
                                    :title="`${entryLabel(item.entry)}\nType: ${item.entry.type}\nDuration: ${formatDuration(item.entry.duration_ms)}\nStart: ${formatDuration(item.entry.start_ms)}${item.entry.origin?.class ? '\nOrigin: ' + item.entry.origin.class : ''}`"
                                ></div>
                            </div>

                            <!-- Duration -->
                            <div class="w-20 pl-2 text-[10px] text-base-content/50 flex-shrink-0 text-right">
                                {{ formatDuration(item.entry.duration_ms) }}
                            </div>
                        </div>
                    </template>
                </div>
            </div>
        </div>

        <!-- Empty state -->
        <div
            v-else
            class="flex-1 flex items-center justify-center"
        >
            <div class="text-center">
                <SvgEmpty class="w-24 mx-auto opacity-25 mb-4" />
                <h1 class="text-lg font-semibold text-base-content/70">No profiles</h1>
                <p class="text-sm text-base-content/50 mt-1">Use ds()->startProfile() and ds()->endProfile()</p>
            </div>
        </div>

        <!-- Profile Selector Dialog -->
        <dialog
            id="profile_selector_dialog"
            class="modal"
        >
            <div class="modal-box min-w-80 max-w-2xl p-4 py-0">
                <div class="py-4 space-y-4 text-sm overflow-auto">
                    <div class="font-semibold px-2">
                        <span class="text-lg">Profiles</span>
                    </div>
                    <div class="max-h-[calc(100vh-22rem)] overflow-auto">
                        <table class="table table-sm w-full">
                            <thead>
                                <tr class="text-xs text-base-content/50">
                                    <th>#</th>
                                    <th>Label</th>
                                    <th class="text-right">Entries</th>
                                    <th class="text-right">Duration</th>
                                    <th class="text-right">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr
                                    v-for="(profile, idx) in profiles"
                                    :key="profile.id"
                                    @click="selectProfile(profile.id)"
                                    class="cursor-pointer hover:bg-base-200 transition-colors"
                                    :class="{ 'bg-neutral text-neutral-content': profile.id === selectedProfile?.id }"
                                >
                                    <td class="text-xs opacity-50">{{ idx + 1 }}</td>
                                    <td class="text-xs font-medium">{{ profile.label }}</td>
                                    <td class="text-xs text-right">{{ profile.summary.total_entries }}</td>
                                    <td class="text-xs text-right font-mono">
                                        {{ formatDuration(profile.total_duration_ms) }}
                                    </td>
                                    <td class="text-xs text-right opacity-50">
                                        {{ dayjs(profile.date_time).fromNow() }}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            <form
                method="dialog"
                class="modal-backdrop"
            >
                <button>close</button>
            </form>
        </dialog>

        <!-- Entry Detail Modal -->
        <dialog
            id="profile_entry_modal"
            class="modal modal-middle"
        >
            <div class="modal-box !rounded-md text-sm w-11/12 max-w-lg">
                <h3 class="font-bold text-lg mb-4">Entry Details</h3>

                <div
                    v-if="selectedEntry"
                    class="space-y-3"
                >
                    <div>
                        <div class="text-xs text-base-content/50 mb-1">Name</div>
                        <div class="text-sm font-medium">{{ selectedEntry.name }}</div>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <div class="text-xs text-base-content/50 mb-1">Type</div>
                            <div class="text-sm">
                                <span
                                    class="px-2 py-0.5 rounded text-xs text-white"
                                    :class="typeColors[selectedEntry.type]"
                                >
                                    {{ typeLabels[selectedEntry.type] || selectedEntry.type }}
                                </span>
                            </div>
                        </div>
                        <div>
                            <div class="text-xs text-base-content/50 mb-1">Duration</div>
                            <div class="text-sm">{{ formatDuration(selectedEntry.duration_ms) }}</div>
                        </div>
                        <div>
                            <div class="text-xs text-base-content/50 mb-1">Start</div>
                            <div class="text-sm">{{ formatDuration(selectedEntry.start_ms) }}</div>
                        </div>
                        <div>
                            <div class="text-xs text-base-content/50 mb-1">End</div>
                            <div class="text-sm">
                                {{ formatDuration((selectedEntry.start_ms || 0) + (selectedEntry.duration_ms || 0)) }}
                            </div>
                        </div>
                    </div>

                    <div v-if="selectedEntry.origin?.class">
                        <div class="text-xs text-base-content/50 mb-1">Origin</div>
                        <div class="text-sm">
                            <span class="font-mono text-xs">{{ selectedEntry.origin.class }}</span>
                            <span
                                v-if="selectedEntry.origin.method"
                                class="text-xs"
                            >
                                ::{{ selectedEntry.origin.method }}()
                            </span>
                        </div>
                        <div
                            v-if="selectedEntry.origin.file"
                            class="text-xs text-base-content/60 mt-1"
                        >
                            {{ selectedEntry.origin.file }}:{{ selectedEntry.origin.line }}
                        </div>
                    </div>

                    <div v-if="selectedEntry.metadata && Object.keys(selectedEntry.metadata).length > 0">
                        <div class="text-xs text-base-content/50 mb-2">Metadata</div>
                        <div class="bg-base-200 rounded p-3 text-xs font-mono overflow-auto max-h-40">
                            <pre>{{ JSON.stringify(selectedEntry.metadata, null, 2) }}</pre>
                        </div>
                    </div>
                </div>

                <div class="modal-action">
                    <form method="dialog">
                        <button
                            class="btn"
                            @click="selectedEntry = null"
                        >
                            Close
                        </button>
                    </form>
                </div>
            </div>
            <form
                method="dialog"
                class="modal-backdrop"
            >
                <button>close</button>
            </form>
        </dialog>
    </div>
</template>

<style scoped>
@reference "./../../styles.css";

/* Tree connector characters rendered via pseudo-elements for pixel-perfect alignment */
.tree-connector {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 24px;
    position: relative;
    font-size: 0; /* hide any text, we draw with borders */
}

/* Vertical continuation line │ */
.tree-vline::before {
    content: '';
    position: absolute;
    left: 50%;
    top: 0;
    bottom: 0;
    width: 1px;
    background: currentColor;
}

/* Fork ├ : vertical full height + horizontal right from center */
.tree-fork::before {
    content: '';
    position: absolute;
    left: 50%;
    top: 0;
    bottom: 0;
    width: 1px;
    background: currentColor;
}
.tree-fork::after {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    width: 50%;
    height: 1px;
    background: currentColor;
}

/* Corner └ : vertical from top to center + horizontal right */
.tree-corner::before {
    content: '';
    position: absolute;
    left: 50%;
    top: 0;
    height: 50%;
    width: 1px;
    background: currentColor;
}
.tree-corner::after {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    width: 50%;
    height: 1px;
    background: currentColor;
}

/* Empty space — no lines */
.tree-space {
    /* intentionally blank */
}
</style>
