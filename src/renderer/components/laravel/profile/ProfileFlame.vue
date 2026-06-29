<script setup lang="ts">
import { computed, ref, watch, toRef } from 'vue';
import type { Profile, ProfileEntry } from '@/store/profile';
import { ChevronRightIcon, XMarkIcon } from '@heroicons/vue/24/outline';
import { entryBarColor, entryLabel, formatDuration, legendDotColor, typeLabels } from './profileHelpers';

const props = defineProps<{
    profile: Profile;
    hiddenTypes: Set<string>;
}>();

// Id of the node currently zoomed into (null = whole profile). Reset when the
// profile changes — zoom doesn't carry across different requests.
const flameRootId = ref<string | null>(null);
watch(toRef(props, 'profile'), () => {
    flameRootId.value = null;
});

// Children indexed by parent_id, each list sorted by start_ms.
const childrenMap = computed((): Map<string | null, ProfileEntry[]> => {
    const map = new Map<string | null, ProfileEntry[]>();
    for (const e of props.profile.entries) {
        const arr = map.get(e.parent_id) ?? [];
        arr.push(e);
        map.set(e.parent_id, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.start_ms - b.start_ms);
    return map;
});

const entriesById = computed((): Map<string, ProfileEntry> => {
    const map = new Map<string, ProfileEntry>();
    for (const e of props.profile.entries) map.set(e.id, e);
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
    const typeAllowed = (e: ProfileEntry) => !props.hiddenTypes.has(e.type);

    const root = flameRootEntry.value;
    const focusStart = root ? root.start_ms : 0;
    const focusDuration = (root ? root.duration_ms : props.profile.total_duration_ms) || 1;

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

// Time ruler scaled to the current focus window (0 … focus duration).
const flameFocusDuration = computed(() => flameRootEntry.value?.duration_ms ?? props.profile.total_duration_ms ?? 0);

const flameMarkers = computed((): number[] => {
    const max = flameFocusDuration.value || 100;
    const step = Math.ceil(max / 10) || 10;
    const out: number[] = [];
    for (let i = 0; i <= max; i += step) out.push(Math.round(i));
    return out;
});

// Instant cursor-following tooltip (native title has a ~1s delay).
const hovered = ref<{ node: FlameNode; x: number; y: number } | null>(null);
const onHover = (e: MouseEvent, node: FlameNode) => {
    hovered.value = { node, x: e.clientX, y: e.clientY };
};

const zoomFlame = (id: string) => {
    flameRootId.value = id;
};
const resetFlameZoom = () => {
    flameRootId.value = null;
};
</script>

<template>
    <div class="flex-1 flex flex-col overflow-hidden min-h-0">
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

        <!-- Time ruler (scaled to the focus window) -->
        <div
            v-if="flameNodes.length > 0"
            class="shrink-0 relative h-6 border-b border-base-content/10 px-3 bg-base-100"
        >
            <div class="relative h-full">
                <div
                    v-for="m in flameMarkers"
                    :key="m"
                    class="absolute text-[9px] text-base-content/40 -translate-x-1/2 top-1/2 -translate-y-1/2"
                    :style="{ left: `${(m / (flameFocusDuration || 1)) * 100}%` }"
                >
                    {{ m }}ms
                </div>
            </div>
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
                        @click="zoomFlame(n.entry.id)"
                        @mousemove="onHover($event, n)"
                        @mouseleave="hovered = null"
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

        <!-- Instant hover tooltip -->
        <Teleport to="body">
            <div
                v-if="hovered"
                class="fixed z-[60] pointer-events-none rounded-lg border border-base-content/20 bg-base-100 shadow-lg px-2.5 py-2 text-[11px] leading-relaxed max-w-xs"
                :style="{ left: `${hovered.x + 14}px`, top: `${hovered.y + 14}px` }"
            >
                <div class="flex items-center gap-1.5 font-medium">
                    <span
                        class="w-2 h-2 rounded-full flex-shrink-0"
                        :class="legendDotColor(hovered.node.entry.type)"
                    ></span>
                    <span class="truncate">{{ entryLabel(hovered.node.entry) }}</span>
                </div>
                <div class="mt-1 grid grid-cols-[auto_1fr] gap-x-2 text-base-content/70 font-mono">
                    <span class="text-base-content/40">Type</span>
                    <span>{{ typeLabels[hovered.node.entry.type] || hovered.node.entry.type }}</span>
                    <span class="text-base-content/40">Total</span>
                    <span
                        >{{ formatDuration(hovered.node.entry.duration_ms) }} ({{
                            hovered.node.width.toFixed(1)
                        }}%)</span
                    >
                    <span class="text-base-content/40">Self</span>
                    <span>{{ formatDuration(hovered.node.self) }}</span>
                </div>
            </div>
        </Teleport>
    </div>
</template>
