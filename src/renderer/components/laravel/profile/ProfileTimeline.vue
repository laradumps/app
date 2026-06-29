<script setup lang="ts">
import { computed } from 'vue';
import type { Profile, ProfileEntry } from '@/store/profile';
import { EyeIcon, EyeSlashIcon, FunnelIcon } from '@heroicons/vue/24/outline';
import {
    entryBarColor,
    entryClass,
    entryLabel,
    entryMethodName,
    formatDuration,
    slowThresholdMs
} from './profileHelpers';

const props = defineProps<{
    profile: Profile;
    hiddenTypes: Set<string>;
}>();

const emit = defineEmits<{
    (e: 'select', entry: ProfileEntry): void;
}>();

// Persisted filter state, owned by the parent (survives view-mode switches).
const showAllEntries = defineModel<boolean>('showAll', { default: false });
const noiseThresholdMs = defineModel<number>('threshold', { default: 1 });

const methodCount = computed(() => props.profile.entries.filter((e) => e.type === 'method').length);

// A `method` entry is "noise" when faster than the threshold.
const isNoise = (entry: ProfileEntry): boolean =>
    entry.type === 'method' && (entry.duration_ms ?? 0) < noiseThresholdMs.value;

const slowMs = computed(() => slowThresholdMs(props.profile.total_duration_ms));
const isSlow = (entry: ProfileEntry): boolean => (entry.duration_ms ?? 0) >= slowMs.value;

const timelineScale = computed(() => {
    const max = props.profile.total_duration_ms;
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
    const totalMs = props.profile.total_duration_ms;
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

// Visible entries: type filters always apply; on top of that, fast `method`
// entries are dropped unless they are an ancestor of a kept entry (so the tree
// never loses a needed branch node). Non-method types are never dropped by the
// noise filter.
const sortedEntries = computed(() => {
    const all = props.profile.entries;
    const byId = new Map(all.map((e) => [e.id, e] as const));
    const typeAllowed = (e: ProfileEntry) => !props.hiddenTypes.has(e.type);

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
    if (showAllEntries.value) return 0;
    const visibleIds = new Set(sortedEntries.value.map((e) => e.id));
    return props.profile.entries.filter((e) => !props.hiddenTypes.has(e.type) && !visibleIds.has(e.id)).length;
});

// Build a depth map for the visible entries. Depth counts only ancestors that
// are themselves visible, so filtered branch nodes don't leave indentation gaps
// (an orphaned child re-parents to its nearest visible ancestor).
const entryDepthMap = computed((): Map<string, number> => {
    const allById = new Map<string, ProfileEntry>();
    for (const e of props.profile.entries) {
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

const itemDepth = (item: TimelineGroup): number => item.depth;

const timelineItems = computed((): TimelineGroup[] => {
    const items: TimelineGroup[] = [];

    // Build contiguous run segments: consecutive method entries from the same
    // class form a "run". Pre-scan to compute total duration per run.
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
    const runDuration = runs.map((r) => r.entries.reduce((sum, e) => sum + (e.duration_ms ?? 0), 0));
    const entryRunIndex = new Map<string, number>();
    runs.forEach((r, i) => r.entries.forEach((e) => entryRunIndex.set(e.id, i)));

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

    // Second pass: compute tree connectors for ALL items using a global tree
    // algorithm. For each item at depth D > 0, compute connectors for columns 1..D.
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const D = itemDepth(item);
        if (D === 0) continue;

        const connectors: string[] = [];
        for (let c = 1; c <= D; c++) {
            let hasFuture = false;
            for (let j = i + 1; j < items.length; j++) {
                const futureD = itemDepth(items[j]);
                if (futureD < c) break; // exited this subtree level
                if (futureD >= c) {
                    if (c < D) {
                        hasFuture = true;
                        break;
                    } else {
                        if (futureD === c) {
                            hasFuture = true;
                            break;
                        }
                    }
                }
            }

            if (c < D) {
                connectors.push(hasFuture ? '│' : ' ');
            } else {
                connectors.push(hasFuture ? '├' : '└');
            }
        }

        item.connectors = connectors;
    }
    return items;
});
</script>

<template>
    <div class="flex-1 flex flex-col overflow-hidden min-h-0">
        <!-- Noise filter bar (when the profile has method entries) -->
        <div
            v-if="methodCount > 0"
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
                        @click="emit('select', item.entry)"
                    >
                        <div
                            class="w-52 pr-2 text-xs text-base-content/70 flex-shrink-0 leading-tight flex items-center"
                        >
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
    </div>
</template>

<style scoped>
@reference "./../../../styles.css";

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
