<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useProfileStore, type Profile, type ProfileEntry } from '@/store/profile';
import { TrashIcon, ClockIcon } from '@heroicons/vue/24/outline';
import SvgEmpty from '@/components/svg/SvgEmpty.vue';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const profileStore = useProfileStore();

const props = defineProps<{
    inScreenWindow?: boolean;
}>();

const selectedEntry = ref<ProfileEntry | null>(null);

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
    job: 'bg-pink-500'
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
    job: 'Jobs'
};

const selectedProfile = computed(() => profileStore.selectedProfile);
const profiles = computed(() => profileStore.profileList);

const timelineScale = computed(() => {
    if (!selectedProfile.value) return { max: 100, step: 10 };
    const max = selectedProfile.value.total_duration_ms;
    const step = Math.ceil(max / 10);
    return { max, step };
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
    const left = (entry.start_ms / totalMs) * 100;
    const width = ((entry.duration_ms || 0.5) / totalMs) * 100;
    return {
        left: `${left}%`,
        width: `${Math.max(width, 0.5)}%`
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
    return [...selectedProfile.value.entries].sort((a, b) => a.start_ms - b.start_ms);
});

const clear = () => {
    profileStore.clear();
};

const selectProfile = (id: string) => {
    profileStore.selectProfile(id);
};
</script>

<template>
    <div
        :class="inScreenWindow ? 'h-[calc(100vh-100px)]' : 'h-[calc(100vh-140px)]'"
        class="flex flex-col"
    >
        <!-- Actions Bar -->
        <div class="flex items-center justify-between w-full border-b border-base-content/10 h-9 px-3 shrink-0">
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
            v-if="profiles.length > 0"
            class="flex-1 flex overflow-hidden min-h-0"
        >
            <!-- Profile List (Left) -->
            <div class="w-48 border-r border-base-content/10 overflow-y-auto shrink-0">
                <div
                    v-for="profile in profiles"
                    :key="profile.id"
                    @click="selectProfile(profile.id)"
                    class="p-2 cursor-pointer hover:bg-base-200 border-b border-base-content/5"
                    :class="{ 'bg-base-200': selectedProfile?.id === profile.id }"
                >
                    <div class="text-xs font-medium truncate">{{ profile.label }}</div>
                    <div class="text-[10px] text-base-content/50 flex items-center gap-1 mt-1">
                        <ClockIcon class="w-3 h-3" />
                        {{ formatDuration(profile.total_duration_ms) }}
                    </div>
                    <div class="text-[10px] text-base-content/40">
                        {{ dayjs(profile.date_time).fromNow() }}
                    </div>
                </div>
            </div>

            <!-- Timeline (Right) -->
            <div
                v-if="selectedProfile"
                class="flex-1 flex flex-col overflow-hidden min-w-0"
            >
                <!-- Header with summary (fixed) -->
                <div class="shrink-0 p-3 border-b border-base-content/10">
                    <h3 class="text-sm font-semibold">{{ selectedProfile.label }}</h3>
                    <div class="flex items-center gap-4 mt-1 text-xs text-base-content/60">
                        <span>Total: {{ formatDuration(selectedProfile.total_duration_ms) }}</span>
                        <span>Entries: {{ selectedProfile.summary.total_entries }}</span>
                    </div>
                    <!-- Legend -->
                    <div class="flex flex-wrap gap-2 mt-2">
                        <div
                            v-for="(data, type) in selectedProfile.summary.by_type"
                            :key="type"
                            class="flex items-center gap-1 text-[10px]"
                        >
                            <span
                                class="w-3 h-3 rounded"
                                :class="typeColors[type]"
                            ></span>
                            <span>{{ typeLabels[type] || type }} ({{ data.count }})</span>
                        </div>
                    </div>
                </div>

                <!-- Scrollable timeline area -->
                <div class="flex-1 overflow-auto min-h-0 p-3">
                    <!-- Time scale -->
                    <div
                        class="relative h-6 mb-1 border-b border-base-content/20 sticky top-0 bg-base-100 z-10 min-w-[600px]"
                    >
                        <div
                            v-for="marker in timeMarkers"
                            :key="marker"
                            class="absolute text-[9px] text-base-content/40 transform -translate-x-1/2"
                            :style="{ left: `${(marker / timelineScale.max) * 100}%` }"
                        >
                            {{ marker }}ms
                        </div>
                    </div>

                    <!-- Timeline entries -->
                    <div class="space-y-1 min-w-[600px]">
                        <div
                            v-for="entry in sortedEntries"
                            :key="entry.id"
                            class="flex items-center h-7 group"
                        >
                            <!-- Label -->
                            <div class="w-52 pr-2 text-right truncate text-xs text-base-content/70 flex-shrink-0">
                                {{ entry.name }}
                            </div>

                            <!-- Bar container -->
                            <div class="flex-1 relative h-5 bg-base-200/50 rounded min-w-[200px]">
                                <!-- Bar -->
                                <div
                                    class="absolute h-full rounded cursor-pointer transition-opacity"
                                    :class="typeColors[entry.type]"
                                    :style="getBarStyle(entry)"
                                    :title="`${entry.name}\nType: ${entry.type}\nDuration: ${formatDuration(entry.duration_ms)}\nStart: ${formatDuration(entry.start_ms)}${entry.origin?.class ? '\nOrigin: ' + entry.origin.class : ''}`"
                                    @click="selectedEntry = entry"
                                ></div>
                            </div>

                            <!-- Duration -->
                            <div class="w-20 pl-2 text-[10px] text-base-content/50 flex-shrink-0">
                                {{ formatDuration(entry.duration_ms) }}
                            </div>
                        </div>
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
</style>
