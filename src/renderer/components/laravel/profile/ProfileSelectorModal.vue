<script setup lang="ts">
import { computed, ref } from 'vue';
import BaseDrawer from '@/components/common/BaseDrawer.vue';
import type { Profile } from '@/store/profile';
import { MagnifyingGlassIcon } from '@heroicons/vue/24/outline';
import { formatDuration, httpMethodColor, parseLabel } from './profileHelpers';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const props = defineProps<{
    profiles: Profile[];
    selectedId: string | null;
}>();

const emit = defineEmits<{
    (e: 'select', id: string): void;
}>();

const isOpen = ref(false);
const search = ref('');

const filteredProfiles = computed(() => {
    const q = search.value.trim().toLowerCase();
    if (!q) return props.profiles;
    return props.profiles.filter((p) => p.label.toLowerCase().includes(q));
});

const open = () => {
    search.value = '';
    isOpen.value = true;
};

const select = (id: string) => {
    emit('select', id);
};

defineExpose({ open });
</script>

<template>
    <BaseDrawer
        id="profile-selector-drawer"
        v-model="isOpen"
        :title="$t('profiler.profiles')"
        width="600px"
    >
        <div class="flex flex-col h-full">
            <!-- Search bar -->
            <div class="flex items-center gap-2 px-4 py-3 border-b border-base-content/10">
                <label class="input input-sm input-bordered flex items-center gap-2 h-8 grow rounded-lg">
                    <MagnifyingGlassIcon class="w-3.5 opacity-50" />
                    <input
                        v-model="search"
                        type="text"
                        class="grow text-xs"
                        :placeholder="$t('profiler.filter')"
                    />
                </label>
                <span class="badge badge-ghost badge-sm font-mono">{{ filteredProfiles.length }}</span>
            </div>

            <!-- List -->
            <div class="p-2 overflow-auto flex flex-col gap-1">
                <button
                    v-for="profile in filteredProfiles"
                    :key="profile.id"
                    type="button"
                    @click="select(profile.id)"
                    class="w-full text-left flex items-center gap-3 px-2.5 py-2 rounded-lg border transition-colors"
                    :class="
                        profile.id === selectedId
                            ? 'border-primary/40 bg-primary/10'
                            : 'border-transparent hover:bg-base-200'
                    "
                >
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
                            {{ profile.summary.total_entries }} {{ $t('profiler.entries') }} ·
                            {{ dayjs(profile.date_time).fromNow() }}
                        </span>
                    </span>

                    <span
                        class="badge badge-ghost badge-sm font-mono flex-shrink-0 text-[10px]"
                        :class="{ 'badge-warning': profile.total_duration_ms >= 100 }"
                    >
                        {{ formatDuration(profile.total_duration_ms) }}
                    </span>
                </button>

                <div
                    v-if="filteredProfiles.length === 0"
                    class="text-center text-xs text-base-content/40 py-6"
                >
                    {{ $t('no_records_found') }}
                </div>
            </div>
        </div>
    </BaseDrawer>
</template>
