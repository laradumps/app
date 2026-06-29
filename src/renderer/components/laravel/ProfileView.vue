<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useProfileStore, type Profile, type ProfileEntry } from '@/store/profile';
import {
    TrashIcon,
    ArrowsRightLeftIcon,
    XMarkIcon,
    EyeIcon,
    EyeSlashIcon,
    FunnelIcon,
    ClockIcon,
    FireIcon,
    MagnifyingGlassIcon,
    Square3Stack3DIcon,
    ChevronRightIcon
} from '@heroicons/vue/24/outline';
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

// Profile selector search
const profileSearch = ref('');
const filteredProfiles = computed(() => {
    const q = profileSearch.value.trim().toLowerCase();
    if (!q) return profiles.value;
    return profiles.value.filter((p) => p.label.toLowerCase().includes(q));
});

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

// View mode: aggregated hotspots (default), chronological timeline, or flame
// graph. The user's choice persists across profile changes, so it is
// intentionally not reset below.
const viewMode = ref<'timeline' | 'hotspots' | 'flame'>('hotspots');

// Flame graph: id of the node currently zoomed into (null = whole profile).
const flameRootId = ref<string | null>(null);
watch(selectedProfile, () => {
    flameRootId.value = null;
});

// Noise filtering: hide fast `method` entries by default
const showAllEntries = ref(false);
const noiseThresholdMs = ref(1);

// Total `method` entries in the profile (used to decide whether to show the noise bar)
const methodCount = computed(() => selectedProfile.value?.entries.filter((e) => e.type === 'method').length ?? 0);

// NOTE: filter state (viewMode, hiddenTypes, showAllEntries, noiseThresholdMs)
// intentionally persists across profile/route changes — e.g. keeping only
// "Methods" visible while switching between requests.

// A `method` entry is "noise" when faster than the threshold.
const isNoise = (entry: ProfileEntry): boolean =>
    entry.type === 'method' && (entry.duration_ms ?? 0) < noiseThresholdMs.value;

// An entry counts as "slow" when at/above 5% of the request total (min 5ms).
const slowThresholdMs = computed(() => Math.max(5, (selectedProfile.value?.total_duration_ms ?? 0) * 0.05));
const isSlowMs = (ms: number | null): boolean => (ms ?? 0) >= slowThresholdMs.value;
const isSlow = (entry: ProfileEntry): boolean => isSlowMs(entry.duration_ms);

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

// Split a profile label like "POST /track-ads" into an HTTP method + path.
const parseLabel = (label: string): { method: string | null; path: string } => {
    const m = label.match(/^(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s+(.+)$/i);
    if (m) return { method: m[1].toUpperCase(), path: m[2] };
    return { method: null, path: label };
};

const httpMethodColor = (method: string): string => {
    switch (method) {
        case 'GET':
            return 'bg-sky-500/15 text-sky-400';
        case 'POST':
            return 'bg-emerald-500/15 text-emerald-400';
        case 'PUT':
        case 'PATCH':
            return 'bg-amber-500/15 text-amber-400';
        case 'DELETE':
            return 'bg-red-500/15 text-red-400';
        default:
            return 'bg-base-content/10 text-base-content/60';
    }
};

// Visible entries for the timeline: type filters always apply; on top of that,
// fast `method` entries are dropped unless they are an ancestor of a kept entry
// (so the tree never loses a needed branch node). Non-method types are never
// dropped by the noise filter.
const sortedEntries = computed(() => {
    if (!selectedProfile.value) return [];
    const all = selectedProfile.value.entries;
    const byId = new Map(all.map((e) => [e.id, e] as const));
    const typeAllowed = (e: ProfileEntry) => !hiddenTypes.value.has(e.type);

    const kept = new Set<string>();
    for (const e of all) {
        if (!typeAllowed(e)) continue;
        if (showAllEntries.value || !isNoise(e)) kept.add(e.id);
    }

    // Promote ancestors of kept entries so the tree stays connected.
    if (!showAllEntries.value) {
        for (const e of all) {
            if (!kept.has(e.id)) continue;
            let pid = e.parent_id;
            const guard = new Set<string>();
            while (pid && !guard.has(pid)) {
                guard.add(pid);
                const parent = byId.get(pid);
                if (!parent) break;
                if (typeAllowed(parent)) kept.add(parent.id);
                pid = parent.parent_id;
            }
        }
    }

    return all.filter((e) => kept.has(e.id)).sort((a, b) => a.start_ms - b.start_ms);
});

// How many type-allowed entries are currently hidden by the noise filter.
const hiddenCount = computed(() => {
    if (!selectedProfile.value || showAllEntries.value) return 0;
    const visibleIds = new Set(sortedEntries.value.map((e) => e.id));
    return selectedProfile.value.entries.filter((e) => !hiddenTypes.value.has(e.type) && !visibleIds.has(e.id)).length;
});

// Build a depth map for the visible entries. Depth counts only ancestors that
// are themselves visible, so filtered branch nodes don't leave indentation gaps
// (an orphaned child re-parents to its nearest visible ancestor).
const entryDepthMap = computed((): Map<string, number> => {
    if (!selectedProfile.value) return new Map();

    // Index all entries by id (use the full unfiltered list so parent refs resolve)
    const allById = new Map<string, ProfileEntry>();
    for (const e of selectedProfile.value.entries) {
        allById.set(e.id, e);
    }

    const visibleIds = new Set(sortedEntries.value.map((e) => e.id));
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

        // Walk up to the nearest visible ancestor; ignore filtered-out parents.
        let pid: string | null = entry.parent_id;
        const guard = new Set<string>();
        while (pid && !guard.has(pid)) {
            guard.add(pid);
            if (visibleIds.has(pid)) {
                const depth = getDepth(pid, visited) + 1;
                depthMap.set(id, depth);
                return depth;
            }
            const parent: ProfileEntry | undefined = allById.get(pid);
            if (!parent) break;
            pid = parent.parent_id;
        }

        depthMap.set(id, 0);
        return 0;
    };

    for (const e of sortedEntries.value) {
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

// Hotspots: aggregate entries by function/name, summing duration and count,
// ordered slowest-first. Respects type filters. Each hotspot keeps its slowest
// entry as a representative so the detail modal shows real origin/metadata.
type Hotspot = {
    key: string;
    label: string;
    type: string;
    totalMs: number;
    count: number;
    rep: ProfileEntry;
};

const hotspots = computed((): Hotspot[] => {
    if (!selectedProfile.value) return [];
    const map = new Map<string, Hotspot>();
    for (const e of selectedProfile.value.entries) {
        if (hiddenTypes.value.has(e.type)) continue;
        const label = entryLabel(e);
        const key = `${e.type}|${label}`;
        const cur = map.get(key);
        if (cur) {
            cur.totalMs += e.duration_ms ?? 0;
            cur.count += 1;
            if ((e.duration_ms ?? 0) > (cur.rep.duration_ms ?? 0)) cur.rep = e;
        } else {
            map.set(key, { key, label, type: e.type, totalMs: e.duration_ms ?? 0, count: 1, rep: e });
        }
    }
    return [...map.values()].sort((a, b) => b.totalMs - a.totalMs);
});

const maxHotspotMs = computed(() => hotspots.value[0]?.totalMs || 1);

// ---- Flame graph (icicle) ----

// Children indexed by parent_id, each list sorted by start_ms.
const childrenMap = computed((): Map<string | null, ProfileEntry[]> => {
    const map = new Map<string | null, ProfileEntry[]>();
    if (!selectedProfile.value) return map;
    for (const e of selectedProfile.value.entries) {
        const arr = map.get(e.parent_id) ?? [];
        arr.push(e);
        map.set(e.parent_id, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.start_ms - b.start_ms);
    return map;
});

const entriesById = computed((): Map<string, ProfileEntry> => {
    const map = new Map<string, ProfileEntry>();
    if (!selectedProfile.value) return map;
    for (const e of selectedProfile.value.entries) map.set(e.id, e);
    return map;
});

// Self time = own duration minus the sum of children durations (durations are inclusive).
const selfMs = (entry: ProfileEntry): number => {
    const children = childrenMap.value.get(entry.id) ?? [];
    const childSum = children.reduce((s, c) => s + (c.duration_ms ?? 0), 0);
    return Math.max(0, (entry.duration_ms ?? 0) - childSum);
};

type FlameNode = {
    entry: ProfileEntry;
    depth: number;
    left: number; // %
    width: number; // %
    self: number; // ms
};

const FLAME_MIN_WIDTH = 0.2; // % — prune blocks narrower than this (and their subtrees)

const flameRootEntry = computed((): ProfileEntry | null =>
    flameRootId.value ? (entriesById.value.get(flameRootId.value) ?? null) : null
);

const flameNodes = computed((): FlameNode[] => {
    if (!selectedProfile.value) return [];
    const typeAllowed = (e: ProfileEntry) => !hiddenTypes.value.has(e.type);

    const root = flameRootEntry.value;
    const focusStart = root ? root.start_ms : 0;
    const focusDuration = (root ? root.duration_ms : selectedProfile.value.total_duration_ms) || 1;

    const nodes: FlameNode[] = [];

    const pushNode = (entry: ProfileEntry, depth: number) => {
        const rawWidth = ((entry.duration_ms ?? 0) / focusDuration) * 100;
        if (rawWidth < FLAME_MIN_WIDTH) return; // prune tiny blocks (children are narrower → pruned too)
        const left = Math.max(0, Math.min(((entry.start_ms - focusStart) / focusDuration) * 100, 100));
        nodes.push({
            entry,
            depth,
            left,
            width: Math.min(rawWidth, 100 - left),
            self: selfMs(entry)
        });
        for (const child of childrenMap.value.get(entry.id) ?? []) {
            if (!typeAllowed(child) || child.duration_ms === null) continue;
            pushNode(child, depth + 1);
        }
    };

    if (root) {
        pushNode(root, 0);
    } else {
        for (const e of childrenMap.value.get(null) ?? []) {
            if (!typeAllowed(e) || e.duration_ms === null) continue;
            pushNode(e, 0);
        }
    }
    return nodes;
});

// Nodes grouped into rows by depth (row 0 = top).
const flameRows = computed((): FlameNode[][] => {
    const rows: FlameNode[][] = [];
    for (const n of flameNodes.value) (rows[n.depth] ??= []).push(n);
    return rows;
});

// Ancestor trail of the focused node (root … focus), for the breadcrumb.
const flameBreadcrumb = computed((): ProfileEntry[] => {
    const root = flameRootEntry.value;
    if (!root) return [];
    const trail: ProfileEntry[] = [];
    let cur: ProfileEntry | undefined = root;
    const guard = new Set<string>();
    while (cur && !guard.has(cur.id)) {
        guard.add(cur.id);
        trail.unshift(cur);
        cur = cur.parent_id ? entriesById.value.get(cur.parent_id) : undefined;
    }
    return trail;
});

const flameTooltip = (n: FlameNode): string => {
    const pct = n.width.toFixed(1);
    return (
        `${entryLabel(n.entry)}\nType: ${typeLabels[n.entry.type] || n.entry.type}` +
        `\nTotal: ${formatDuration(n.entry.duration_ms)} (${pct}% of focus)` +
        `\nSelf: ${formatDuration(n.self)}` +
        (n.entry.origin?.class ? `\nOrigin: ${n.entry.origin.class}` : '')
    );
};

const zoomFlame = (id: string) => {
    flameRootId.value = id;
};
const resetFlameZoom = () => {
    flameRootId.value = null;
};

const clear = () => {
    profileStore.clear();
};

const selectProfile = (id: string) => {
    profileStore.selectProfile(id);
    const modal = document.getElementById('profile_selector_dialog') as HTMLDialogElement;
    if (modal) modal.close();
};

const openProfilesModal = () => {
    profileSearch.value = '';
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

                <!-- Right: view toggle + badges -->
                <div class="flex items-center gap-2">
                    <div class="join">
                        <button
                            class="btn btn-xs join-item gap-1"
                            :class="viewMode === 'timeline' ? 'btn-active' : 'btn-ghost'"
                            @click="viewMode = 'timeline'"
                        >
                            <ClockIcon class="w-3" />
                            Timeline
                        </button>
                        <button
                            class="btn btn-xs join-item gap-1"
                            :class="viewMode === 'hotspots' ? 'btn-active' : 'btn-ghost'"
                            @click="viewMode = 'hotspots'"
                        >
                            <FireIcon class="w-3" />
                            Hotspots
                        </button>
                        <button
                            class="btn btn-xs join-item gap-1"
                            :class="viewMode === 'flame' ? 'btn-active' : 'btn-ghost'"
                            @click="viewMode = 'flame'"
                        >
                            <Square3Stack3DIcon class="w-3" />
                            Flame
                        </button>
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

            <!-- Noise filter bar (timeline only, when the profile has method entries) -->
            <div
                v-if="viewMode === 'timeline' && methodCount > 0"
                class="shrink-0 flex items-center justify-between gap-2 px-3 py-1.5 border-b border-base-content/10 text-[11px] text-base-content/60"
            >
                <span class="flex items-center gap-1.5">
                    <FunnelIcon class="w-3 flex-shrink-0" />
                    <template v-if="!showAllEntries && hiddenCount > 0">
                        Hiding fast methods —
                        <span class="font-medium text-base-content/80">{{ hiddenCount }} hidden</span>
                    </template>
                    <template v-else-if="showAllEntries">Showing all entries</template>
                    <template v-else>No fast methods to hide</template>
                </span>
                <span class="flex items-center gap-2">
                    <span
                        v-if="!showAllEntries"
                        class="flex items-center gap-1.5"
                    >
                        <span class="text-base-content/50">Hide &lt;</span>
                        <div class="join">
                            <button
                                v-for="opt in [0.5, 1, 5]"
                                :key="opt"
                                class="btn btn-xs join-item font-mono"
                                :class="noiseThresholdMs === opt ? 'btn-active btn-primary' : 'btn-ghost'"
                                @click="noiseThresholdMs = opt"
                            >
                                {{ opt }}ms
                            </button>
                        </div>
                    </span>
                    <button
                        class="btn btn-ghost btn-xs gap-1"
                        @click="showAllEntries = !showAllEntries"
                    >
                        <component
                            :is="showAllEntries ? EyeSlashIcon : EyeIcon"
                            class="w-3"
                        />
                        {{ showAllEntries ? 'Hide noise' : 'Show all' }}
                    </button>
                </span>
            </div>

            <!-- Time scale ruler (fixed, outside scroll area) -->
            <div
                v-if="viewMode === 'timeline'"
                class="shrink-0 relative h-7 border-b border-base-content/20 bg-base-100 px-3"
            >
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
            <div
                v-if="viewMode === 'timeline'"
                class="flex-1 overflow-auto min-h-0 px-3 py-2"
            >
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
                                    :class="[
                                        entryBarColor(item.entry),
                                        isSlow(item.entry) ? 'ring-1 ring-base-content/40' : ''
                                    ]"
                                    :style="getBarStyle(item.entry)"
                                    :title="`${entryLabel(item.entry)}\nType: ${item.entry.type}\nDuration: ${formatDuration(item.entry.duration_ms)}\nStart: ${formatDuration(item.entry.start_ms)}${item.entry.origin?.class ? '\nOrigin: ' + item.entry.origin.class : ''}`"
                                ></div>
                            </div>

                            <!-- Duration -->
                            <div
                                class="w-20 pl-2 text-[10px] flex-shrink-0 text-right"
                                :class="
                                    isSlow(item.entry)
                                        ? 'text-base-content/90 font-medium'
                                        : isNoise(item.entry)
                                          ? 'text-base-content/30'
                                          : 'text-base-content/50'
                                "
                            >
                                {{ formatDuration(item.entry.duration_ms) }}
                            </div>
                        </div>
                    </template>
                </div>
            </div>

            <!-- Hotspots view: slowest aggregated functions first -->
            <div
                v-else-if="viewMode === 'hotspots'"
                class="flex-1 overflow-auto min-h-0 px-3 py-2"
            >
                <div
                    v-for="(h, idx) in hotspots"
                    :key="h.key"
                    class="flex items-center gap-2.5 px-1 py-1 rounded cursor-pointer hover:bg-base-content/5 transition-colors"
                    @click="selectedEntry = h.rep"
                >
                    <span class="w-5 text-[10px] text-base-content/40 font-mono text-right flex-shrink-0">
                        {{ idx + 1 }}
                    </span>
                    <span
                        class="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        :class="legendDotColor(h.type)"
                    ></span>
                    <span class="w-44 text-xs text-base-content/80 truncate flex-shrink-0">{{ h.label }}</span>
                    <div class="flex-1 relative h-3.5 bg-base-200/50 rounded overflow-hidden">
                        <div
                            class="absolute h-full rounded"
                            :class="typeColors[h.type]"
                            :style="{ width: `${(h.totalMs / maxHotspotMs) * 100}%` }"
                        ></div>
                    </div>
                    <span class="badge badge-ghost badge-xs font-mono flex-shrink-0">×{{ h.count }}</span>
                    <span
                        class="w-16 text-right text-[10px] font-mono flex-shrink-0"
                        :class="isSlowMs(h.totalMs) ? 'text-base-content/90 font-medium' : 'text-base-content/50'"
                    >
                        {{ formatDuration(h.totalMs) }}
                    </span>
                </div>
            </div>

            <!-- Flame graph (icicle) view -->
            <div
                v-else
                class="flex-1 flex flex-col overflow-hidden min-h-0"
            >
                <!-- Breadcrumb / zoom controls -->
                <div
                    v-if="flameBreadcrumb.length > 0"
                    class="shrink-0 flex items-center gap-1 px-3 py-1.5 border-b border-base-content/10 text-[11px] overflow-x-auto"
                >
                    <button
                        class="text-base-content/50 hover:text-base-content shrink-0"
                        @click="resetFlameZoom"
                    >
                        Root
                    </button>
                    <template
                        v-for="(node, bi) in flameBreadcrumb"
                        :key="node.id"
                    >
                        <ChevronRightIcon class="w-3 text-base-content/30 shrink-0" />
                        <button
                            class="shrink-0 font-mono truncate max-w-40"
                            :class="
                                bi === flameBreadcrumb.length - 1
                                    ? 'text-base-content/90'
                                    : 'text-base-content/50 hover:text-base-content'
                            "
                            @click="zoomFlame(node.id)"
                        >
                            {{ entryLabel(node) }}
                        </button>
                    </template>
                    <button
                        class="btn btn-ghost btn-xs gap-1 ml-auto shrink-0"
                        @click="resetFlameZoom"
                    >
                        <XMarkIcon class="w-3" />
                        Reset zoom
                    </button>
                </div>

                <!-- Stacked rows -->
                <div class="flex-1 overflow-auto min-h-0 px-3 py-2">
                    <div
                        v-if="flameNodes.length > 0"
                        class="flex flex-col gap-px"
                    >
                        <div
                            v-for="(row, depth) in flameRows"
                            :key="depth"
                            class="relative h-5 w-full"
                        >
                            <div
                                v-for="n in row"
                                :key="n.entry.id"
                                class="absolute h-full rounded-sm flex items-center px-1 overflow-hidden cursor-pointer text-[10px] leading-none text-black/80 hover:brightness-110 transition-all"
                                :class="entryBarColor(n.entry)"
                                :style="{ left: `${n.left}%`, width: `${n.width}%` }"
                                :title="flameTooltip(n)"
                                @click="zoomFlame(n.entry.id)"
                            >
                                <span class="truncate">{{ entryLabel(n.entry) }}</span>
                            </div>
                        </div>
                    </div>
                    <div
                        v-else
                        class="h-full flex items-center justify-center text-xs text-base-content/40"
                    >
                        No call stack to display
                    </div>
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
            <div class="modal-box rounded-xl min-w-80 max-w-2xl p-0 overflow-hidden">
                <!-- Header -->
                <div class="flex items-center justify-between gap-3 px-4 pt-4 pb-3 border-b border-base-content/10">
                    <span class="text-base font-semibold">Profiles</span>
                    <div class="flex items-center gap-2">
                        <label class="input input-sm input-bordered flex items-center gap-2 h-8 w-44 rounded-lg">
                            <MagnifyingGlassIcon class="w-3.5 opacity-50" />
                            <input
                                v-model="profileSearch"
                                type="text"
                                class="grow text-xs"
                                placeholder="Filter…"
                            />
                        </label>
                        <span class="badge badge-ghost badge-sm font-mono">{{ filteredProfiles.length }}</span>
                    </div>
                </div>

                <!-- List -->
                <div class="p-2 max-h-[calc(100vh-22rem)] overflow-auto flex flex-col gap-1">
                    <button
                        v-for="(profile, idx) in filteredProfiles"
                        :key="profile.id"
                        type="button"
                        @click="selectProfile(profile.id)"
                        class="w-full text-left flex items-center gap-3 px-2.5 py-2 rounded-lg border transition-colors"
                        :class="
                            profile.id === selectedProfile?.id
                                ? 'border-primary/40 bg-primary/10'
                                : 'border-transparent hover:bg-base-200'
                        "
                    >
                        <span class="w-5 text-[11px] font-mono text-base-content/40 text-right flex-shrink-0">
                            {{ idx + 1 }}
                        </span>

                        <span
                            v-if="parseLabel(profile.label).method"
                            class="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded flex-shrink-0 w-14 text-center"
                            :class="httpMethodColor(parseLabel(profile.label).method!)"
                        >
                            {{ parseLabel(profile.label).method }}
                        </span>

                        <span class="flex-1 min-w-0">
                            <span class="block text-xs font-medium truncate">
                                {{ parseLabel(profile.label).path }}
                            </span>
                            <span class="block text-[10px] text-base-content/40 mt-0.5">
                                {{ profile.summary.total_entries }} entries · {{ dayjs(profile.date_time).fromNow() }}
                            </span>
                        </span>

                        <span
                            class="badge badge-sm font-mono flex-shrink-0"
                            :class="profile.total_duration_ms >= 100 ? 'badge-warning' : 'badge-ghost'"
                        >
                            {{ formatDuration(profile.total_duration_ms) }}
                        </span>
                    </button>

                    <div
                        v-if="filteredProfiles.length === 0"
                        class="text-center text-xs text-base-content/40 py-6"
                    >
                        No profiles match “{{ profileSearch }}”
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
            <div
                v-if="selectedEntry"
                class="modal-box rounded-xl text-sm w-11/12 max-w-lg p-0"
            >
                <!-- Header: type dot + entry name + close -->
                <div class="flex items-center gap-2.5 px-4 pt-4 pb-3">
                    <span
                        class="w-3 h-3 rounded-full flex-shrink-0"
                        :class="legendDotColor(selectedEntry.type)"
                    ></span>
                    <span class="flex-1 font-medium truncate">{{ entryLabel(selectedEntry) }}</span>
                    <form method="dialog">
                        <button
                            class="btn btn-ghost btn-circle btn-sm"
                            aria-label="Close"
                            @click="selectedEntry = null"
                        >
                            <XMarkIcon class="w-4" />
                        </button>
                    </form>
                </div>

                <!-- Badge row: type + start/end + duration -->
                <div class="flex flex-wrap items-center gap-1.5 px-4 pb-3 border-b border-base-content/10">
                    <span
                        class="badge badge-sm border-0 text-white font-mono"
                        :class="typeColors[selectedEntry.type]"
                    >
                        {{ typeLabels[selectedEntry.type] || selectedEntry.type }}
                    </span>
                    <span class="badge badge-ghost badge-sm font-mono">
                        start {{ formatDuration(selectedEntry.start_ms) }}
                    </span>
                    <span class="badge badge-ghost badge-sm font-mono">
                        end {{ formatDuration((selectedEntry.start_ms || 0) + (selectedEntry.duration_ms || 0)) }}
                    </span>
                    <span class="badge badge-primary badge-sm font-mono">
                        {{ formatDuration(selectedEntry.duration_ms) }}
                    </span>
                </div>

                <!-- Body -->
                <div class="p-4 space-y-3">
                    <div v-if="selectedEntry.name !== entryLabel(selectedEntry)">
                        <div class="text-xs text-base-content/50 mb-1">Name</div>
                        <div class="text-sm font-medium break-all">{{ selectedEntry.name }}</div>
                    </div>

                    <div v-if="selectedEntry.origin?.class">
                        <div class="text-xs text-base-content/50 mb-1">Origin</div>
                        <div class="text-sm font-mono text-xs break-all">
                            {{ selectedEntry.origin.class
                            }}<span v-if="selectedEntry.origin.method">::{{ selectedEntry.origin.method }}()</span>
                        </div>
                        <div
                            v-if="selectedEntry.origin.file"
                            class="text-xs text-base-content/60 mt-1 font-mono break-all"
                        >
                            {{ selectedEntry.origin.file }}:{{ selectedEntry.origin.line }}
                        </div>
                    </div>

                    <div v-if="selectedEntry.metadata && Object.keys(selectedEntry.metadata).length > 0">
                        <div class="text-xs text-base-content/50 mb-1">Metadata</div>
                        <div class="bg-base-200 rounded-lg p-3 text-xs font-mono overflow-auto max-h-40">
                            <pre>{{ JSON.stringify(selectedEntry.metadata, null, 2) }}</pre>
                        </div>
                    </div>
                </div>

                <!-- Footer -->
                <div class="flex justify-end px-4 py-3 border-t border-base-content/10">
                    <form method="dialog">
                        <button
                            class="btn btn-sm"
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
