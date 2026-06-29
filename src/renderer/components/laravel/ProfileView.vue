<script setup lang="ts">
import { computed, ref } from 'vue';
import { useProfileStore, type ProfileEntry } from '@/store/profile';
import { ArrowsRightLeftIcon, ClockIcon, FireIcon, Square3Stack3DIcon, TrashIcon } from '@heroicons/vue/24/outline';
import SvgEmpty from '@/components/svg/SvgEmpty.vue';
import { formatDuration } from './profile/profileHelpers';
import ProfileLegend from './profile/ProfileLegend.vue';
import ProfileTimeline from './profile/ProfileTimeline.vue';
import ProfileHotspots from './profile/ProfileHotspots.vue';
import ProfileFlame from './profile/ProfileFlame.vue';
import ProfileSelectorModal from './profile/ProfileSelectorModal.vue';
import ProfileEntryModal from './profile/ProfileEntryModal.vue';

defineProps<{
    inScreenWindow?: boolean;
}>();

const profileStore = useProfileStore();

const selectedProfile = computed(() => profileStore.selectedProfile);
const profiles = computed(() => profileStore.profileList);

// Entry currently shown in the detail modal.
const selectedEntry = ref<ProfileEntry | null>(null);

// Selector modal handle.
const selectorModal = ref<InstanceType<typeof ProfileSelectorModal> | null>(null);

// Types currently hidden across all views.
const hiddenTypes = ref<Set<string>>(new Set());
const toggleType = (type: string) => {
    const next = new Set(hiddenTypes.value);
    if (next.has(type)) next.delete(type);
    else next.add(type);
    hiddenTypes.value = next;
};

// View mode (hotspots by default) and timeline noise filters. These persist
// across profile/route changes — e.g. keeping only "Methods" visible while
// switching between requests.
const viewMode = ref<'timeline' | 'hotspots' | 'flame'>('hotspots');
const showAllEntries = ref(false);
const noiseThresholdMs = ref(1);

const clear = () => profileStore.clear();

const selectProfile = (id: string) => profileStore.selectProfile(id);
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
            <!-- Selector bar -->
            <div class="shrink-0 flex justify-between items-center gap-3 px-3 h-10 border-b border-base-content/10">
                <button
                    class="max-w-1/2 btn btn-soft bg-base-100 btn-sm text-xs font-normal p-2 pr-3 rounded-full"
                    @click="selectorModal?.open()"
                >
                    <ArrowsRightLeftIcon class="w-4 inline-block" />
                    <span class="opacity-80"> ({{ profiles.length }}) </span>
                    <span class="truncate">{{ selectedProfile.label }}</span>
                </button>

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

            <!-- Legend filters (shared across views) -->
            <ProfileLegend
                :by-type="selectedProfile.summary.by_type"
                :hidden-types="hiddenTypes"
                @toggle="toggleType"
            />

            <!-- Active view -->
            <ProfileTimeline
                v-if="viewMode === 'timeline'"
                :profile="selectedProfile"
                :hidden-types="hiddenTypes"
                v-model:show-all="showAllEntries"
                v-model:threshold="noiseThresholdMs"
                @select="selectedEntry = $event"
            />
            <ProfileHotspots
                v-else-if="viewMode === 'hotspots'"
                :profile="selectedProfile"
                :hidden-types="hiddenTypes"
                @select="selectedEntry = $event"
            />
            <ProfileFlame
                v-else
                :profile="selectedProfile"
                :hidden-types="hiddenTypes"
            />
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

        <!-- Modals -->
        <ProfileSelectorModal
            ref="selectorModal"
            :profiles="profiles"
            :selected-id="selectedProfile?.id ?? null"
            @select="selectProfile"
        />
        <ProfileEntryModal v-model="selectedEntry" />
    </div>
</template>
