<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Profile, ProfileEntry } from '@/store/profile';
import { entryLabel, formatDuration, legendDotColor, slowThresholdMs, typeColors } from './profileHelpers';

const props = defineProps<{
    profile: Profile;
    hiddenTypes: Set<string>;
}>();

const emit = defineEmits<{
    (e: 'select', entry: ProfileEntry): void;
}>();

// Resizable name column (horizontal splitter) so long names (e.g. deeply
// nested render calls) are readable instead of truncated. 176px matches w-44.
const NAME_COLUMN_MIN = 100;
const NAME_COLUMN_MAX = 720;
// Fixed columns before the name: px-3 (12) + index w-5 (20) + gap (10)
// + dot w-2.5 (10) + gap (10) = 62px. The divider sits at that offset + width.
const NAME_COLUMN_OFFSET = 62;
const nameWidth = ref(176);

let resizeStartX = 0;
let resizeStartWidth = 0;

const onResizeMove = (event: MouseEvent): void => {
    const next = resizeStartWidth + (event.clientX - resizeStartX);
    nameWidth.value = Math.min(NAME_COLUMN_MAX, Math.max(NAME_COLUMN_MIN, next));
};

const onResizeEnd = (): void => {
    window.removeEventListener('mousemove', onResizeMove);
    window.removeEventListener('mouseup', onResizeEnd);
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
};

const startResize = (event: MouseEvent): void => {
    resizeStartX = event.clientX;
    resizeStartWidth = nameWidth.value;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    window.addEventListener('mousemove', onResizeMove);
    window.addEventListener('mouseup', onResizeEnd);
};

const slowMs = computed(() => slowThresholdMs(props.profile.total_duration_ms));

// Aggregate entries by function/name, summing duration and count, ordered
// slowest-first. Respects type filters. Each hotspot keeps its slowest entry as
// a representative so the detail modal shows real origin/metadata.
type Hotspot = {
    key: string;
    label: string;
    type: string;
    totalMs: number;
    count: number;
    rep: ProfileEntry;
};

const hotspots = computed((): Hotspot[] => {
    const map = new Map<string, Hotspot>();
    for (const e of props.profile.entries) {
        if (props.hiddenTypes.has(e.type)) continue;
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
</script>

<template>
    <div class="flex-1 relative min-h-0">
        <!-- Draggable divider to resize the name column (horizontal splitter). -->
        <div
            class="absolute top-0 bottom-0 z-20 w-2 -translate-x-1/2 cursor-col-resize group/resize"
            :style="{ left: `${NAME_COLUMN_OFFSET + nameWidth}px` }"
            title="Drag to resize the name column"
            @mousedown.prevent="startResize"
        >
            <div
                class="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-base-content/15 transition-colors group-hover/resize:w-0.5 group-hover/resize:bg-primary"
            ></div>
        </div>

        <div class="h-full overflow-auto px-3 py-2">
            <div
                v-for="(h, idx) in hotspots"
                :key="h.key"
                class="flex items-center gap-2.5 px-1 py-1 rounded cursor-pointer hover:bg-base-content/5 transition-colors"
                @click="emit('select', h.rep)"
            >
                <span class="w-5 text-[10px] text-base-content/40 font-mono text-right flex-shrink-0">
                    {{ idx + 1 }}
                </span>
                <span
                    class="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    :class="legendDotColor(h.type)"
                ></span>
                <span
                    class="text-xs text-base-content/80 truncate flex-shrink-0"
                    :style="{ width: nameWidth + 'px' }"
                    :title="h.label"
                    >{{ h.label }}</span
                >
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
                    :class="h.totalMs >= slowMs ? 'text-base-content/90 font-medium' : 'text-base-content/50'"
                >
                    {{ formatDuration(h.totalMs) }}
                </span>
            </div>
        </div>
    </div>
</template>
