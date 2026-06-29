<script setup lang="ts">
import { computed } from 'vue';
import type { Profile, ProfileEntry } from '@/store/profile';
import { entryLabel, formatDuration, legendDotColor, slowThresholdMs, typeColors } from './profileHelpers';

const props = defineProps<{
    profile: Profile;
    hiddenTypes: Set<string>;
}>();

const emit = defineEmits<{
    (e: 'select', entry: ProfileEntry): void;
}>();

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
    <div class="flex-1 overflow-auto min-h-0 px-3 py-2">
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
                :class="h.totalMs >= slowMs ? 'text-base-content/90 font-medium' : 'text-base-content/50'"
            >
                {{ formatDuration(h.totalMs) }}
            </span>
        </div>
    </div>
</template>
