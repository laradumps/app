<script setup lang="ts">
import { computed, ref } from 'vue';
import { useProfileStore, type ProfileEntry } from '@/store/profile';
import { useCurrentProject } from '@/store/current-project';
import {
    ArrowsRightLeftIcon,
    ClockIcon,
    CogIcon,
    FireIcon,
    Square3Stack3DIcon,
    TrashIcon,
    PlayIcon
} from '@heroicons/vue/24/outline';
import EmptyState from '@/components/common/EmptyState.vue';
import ViewToolbar from '@/components/common/ViewToolbar.vue';
import IconPause from '@/components/Icons/IconPause.vue';
import { usePauseProfileStore } from '@/store/pauses';
import { formatDuration } from './profile/profileHelpers';
import ProfileLegend from './profile/ProfileLegend.vue';
import ProfileTimeline from './profile/ProfileTimeline.vue';
import ProfileHotspots from './profile/ProfileHotspots.vue';
import ProfileFlame from './profile/ProfileFlame.vue';
import ProfileSelectorModal from './profile/ProfileSelectorModal.vue';
import ProfileEntryModal from './profile/ProfileEntryModal.vue';

const props = defineProps<{
    inScreenWindow?: boolean;
    hideHeader?: boolean;
    yamlConfig?: Record<string, any>;
}>();

const profileStore = useProfileStore();
const pauseProfile = usePauseProfileStore();
const currentProjectStore = useCurrentProject();

const selectedProfile = computed(() => profileStore.selectedProfile);
const profiles = computed(() => profileStore.profileList);

const selectedEntry = ref<ProfileEntry | null>(null);

const selectorModal = ref<InstanceType<typeof ProfileSelectorModal> | null>(null);

const hiddenTypes = ref<Set<string>>(new Set());
const toggleType = (type: string) => {
    const next = new Set(hiddenTypes.value);
    if (next.has(type)) next.delete(type);
    else next.add(type);
    hiddenTypes.value = next;
};

const viewMode = ref<'timeline' | 'hotspots' | 'flame'>('hotspots');
const showAllEntries = ref(false);
const noiseThresholdMs = ref(1);

const clear = () => {
    if (pauseProfile.is_paused) {
        pauseProfile.toggle();
    }
    profileStore.clear();
};

const selectProfile = (id: string) => profileStore.selectProfile(id);

const updateYaml = (section: string, values: Record<string, any>) => {
    if (!props.yamlConfig || !currentProjectStore.projectInfo?.path) {
        console.warn('Cannot update YAML config: missing yamlConfig or project path');
        return;
    }

    window.ipcRenderer.send('storage.update-section', {
        path: currentProjectStore.projectInfo.path,
        section,
        values
    });
};

const labelFor = (key: string): string => key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');

const profilingEnabled = computed(() => props.yamlConfig?.observers?.profiler === true);
const toggleProfiling = () => updateYaml('observers', { profiler: !profilingEnabled.value });

const yamlProfileOptions = computed(() => {
    const profiler = props.yamlConfig?.profiler;
    if (!profiler) return [];
    return Object.entries(profiler)
        .filter(([, value]) => typeof value === 'boolean')
        .map(([key, value]) => ({ key, label: labelFor(key), enabled: value === true }));
});

const toggleProfileOption = (key: string, current: boolean) => updateYaml('profiler', { [key]: !current });

const yamlCaptureOptions = computed(() => {
    const capture = props.yamlConfig?.profiler?.capture;
    if (!capture || typeof capture !== 'object') return [];
    return Object.entries(capture)
        .filter(([, value]) => typeof value === 'boolean')
        .map(([key, value]) => ({ key, label: labelFor(key), enabled: value === true }));
});

const toggleCapture = (key: string, current: boolean) => {
    const capture = { ...(props.yamlConfig?.profiler?.capture ?? {}) };
    capture[key] = !current;
    updateYaml('profiler', { capture });
};

const hasProfileConfig = computed(
    () =>
        Object.prototype.hasOwnProperty.call(props.yamlConfig?.observers ?? {}, 'profiler') ||
        yamlProfileOptions.value.length > 0 ||
        yamlCaptureOptions.value.length > 0
);
const yamlConfigActive = computed(() => profilingEnabled.value || yamlProfileOptions.value.some((c) => c.enabled));
</script>

<template>
    <div
        :class="inScreenWindow ? 'h-[calc(100vh-100px)]' : 'h-[calc(100vh-140px)]'"
        class="flex flex-col"
    >
        <!-- Actions Bar -->
        <ViewToolbar
            v-if="!hideHeader"
            :count="profiles.length"
            noun="profile"
        >
            <template #right>
                <!-- YAML Configuration Dropdown -->
                <div class="dropdown dropdown-bottom dropdown-end">
                    <button
                        tabindex="0"
                        role="button"
                        class="btn btn-ghost btn-circle btn-xs"
                        :class="{ 'text-primary': yamlConfigActive }"
                        :data-tippy-content="$t('profiler.yaml_configuration')"
                    >
                        <CogIcon class="w-4" />
                    </button>
                    <div
                        tabindex="0"
                        class="p-2 shadow-xl dropdown-content menu bg-base-300 backdrop-blur-xl rounded-xl border-0 z-[100] w-auto min-w-44"
                    >
                        <template v-if="hasProfileConfig">
                            <!-- Master switch -->
                            <button
                                @click="toggleProfiling"
                                class="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left"
                                :class="
                                    profilingEnabled
                                        ? 'bg-base-content/10 text-base-content font-medium'
                                        : 'text-base-content/70 hover:bg-base-content/5 hover:text-base-content'
                                "
                            >
                                <span class="size-2.5 rounded-full relative flex items-center justify-center">
                                    <span
                                        v-if="profilingEnabled"
                                        class="absolute inline-flex h-full w-full rounded-full bg-success opacity-20"
                                    ></span>
                                    <span
                                        class="relative inline-flex rounded-full size-2 transition-all duration-200"
                                        :class="
                                            profilingEnabled
                                                ? 'bg-success shadow-[0_0_6px_rgba(34,197,94,0.8)]'
                                                : 'bg-base-content/20'
                                        "
                                    ></span>
                                </span>
                                <span class="truncate text-xs whitespace-nowrap">{{
                                    $t('profiler.enable_profiling')
                                }}</span>
                            </button>

                            <!-- Profile options -->
                            <div v-if="yamlProfileOptions.length > 0">
                                <div class="menu-title mt-2 mb-2">
                                    <span class="text-[9px] text-base-content/40 font-bold uppercase tracking-widest">{{
                                        $t('profiler.options')
                                    }}</span>
                                </div>
                                <div class="flex flex-col gap-1.5">
                                    <button
                                        v-for="control in yamlProfileOptions"
                                        :key="control.key"
                                        @click="toggleProfileOption(control.key, control.enabled)"
                                        class="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left"
                                        :class="
                                            control.enabled
                                                ? 'bg-base-content/10 text-base-content font-medium'
                                                : 'text-base-content/70 hover:bg-base-content/5 hover:text-base-content'
                                        "
                                    >
                                        <span class="size-2.5 rounded-full relative flex items-center justify-center">
                                            <span
                                                v-if="control.enabled"
                                                class="absolute inline-flex h-full w-full rounded-full bg-success opacity-20"
                                            ></span>
                                            <span
                                                class="relative inline-flex rounded-full size-2 transition-all duration-200"
                                                :class="
                                                    control.enabled
                                                        ? 'bg-success shadow-[0_0_6px_rgba(34,197,94,0.8)]'
                                                        : 'bg-base-content/20'
                                                "
                                            ></span>
                                        </span>
                                        <span class="truncate capitalize text-xs whitespace-nowrap">{{
                                            control.label
                                        }}</span>
                                    </button>
                                </div>
                            </div>

                            <!-- Capture options -->
                            <div v-if="yamlCaptureOptions.length > 0">
                                <div class="menu-title mt-2 mb-2">
                                    <span class="text-[9px] text-base-content/40 font-bold uppercase tracking-widest">{{
                                        $t('profiler.capture')
                                    }}</span>
                                </div>
                                <div class="flex flex-col gap-1.5">
                                    <button
                                        v-for="control in yamlCaptureOptions"
                                        :key="control.key"
                                        @click="toggleCapture(control.key, control.enabled)"
                                        class="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left"
                                        :class="
                                            control.enabled
                                                ? 'bg-base-content/10 text-base-content font-medium'
                                                : 'text-base-content/70 hover:bg-base-content/5 hover:text-base-content'
                                        "
                                    >
                                        <span class="size-2.5 rounded-full relative flex items-center justify-center">
                                            <span
                                                v-if="control.enabled"
                                                class="absolute inline-flex h-full w-full rounded-full bg-success opacity-20"
                                            ></span>
                                            <span
                                                class="relative inline-flex rounded-full size-2 transition-all duration-200"
                                                :class="
                                                    control.enabled
                                                        ? 'bg-success shadow-[0_0_6px_rgba(34,197,94,0.8)]'
                                                        : 'bg-base-content/20'
                                                "
                                            ></span>
                                        </span>
                                        <span class="truncate capitalize text-xs whitespace-nowrap">{{
                                            control.label
                                        }}</span>
                                    </button>
                                </div>
                            </div>
                        </template>

                        <div
                            v-else
                            class="text-xs text-base-content/60 p-2"
                        >
                            {{ $t('profiler.no_configuration') }}
                        </div>
                    </div>
                </div>

                <!-- Pause -->
                <button
                    @click="pauseProfile.toggle()"
                    class="btn btn-ghost btn-circle btn-sm"
                    :class="{
                        'text-primary': pauseProfile.is_paused
                    }"
                    :data-tippy-content="$t('pause')"
                >
                    <PlayIcon
                        v-if="pauseProfile.is_paused"
                        class="w-4 text-warning"
                    />
                    <IconPause
                        v-else
                        class="w-4"
                    />
                </button>

                <!-- Clear -->
                <button
                    v-if="profiles.length > 0"
                    @click="clear"
                    class="btn btn-ghost btn-circle btn-sm text-error/70 hover:text-error"
                    :data-tippy-content="$t('clear')"
                >
                    <TrashIcon class="w-4" />
                </button>
            </template>
        </ViewToolbar>

        <!-- Pause Banner -->
        <div
            v-if="pauseProfile.is_paused"
            class="bg-warning/10 text-warning text-[10px] px-3 py-1.5 flex items-center gap-2 border-b border-warning/20 shrink-0"
        >
            <PlayIcon class="w-3 h-3" />
            <span>{{ $t('app.inactive_banner') }}</span>
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
                    <span class="badge badge-ghost badge-sm font-mono">{{ profiles.length }}</span>
                    <span class="truncate">{{ selectedProfile.label }}</span>
                </button>

                <div class="flex items-center gap-2">
                    <div class="join">
                        <button
                            class="btn btn-soft btn-xs join-item gap-1"
                            :class="viewMode === 'timeline' ? 'btn-active' : 'btn-ghost'"
                            @click="viewMode = 'timeline'"
                        >
                            <ClockIcon class="w-3" />
                            {{ $t('profiler.timeline') }}
                        </button>
                        <button
                            class="btn btn-soft btn-xs join-item gap-1"
                            :class="viewMode === 'hotspots' ? 'btn-active' : 'btn-ghost'"
                            @click="viewMode = 'hotspots'"
                        >
                            <FireIcon class="w-3" />
                            {{ $t('profiler.hotspots') }}
                        </button>
                        <button
                            class="btn btn-soft btn-xs join-item gap-1"
                            :class="viewMode === 'flame' ? 'btn-active' : 'btn-ghost'"
                            @click="viewMode = 'flame'"
                        >
                            <Square3Stack3DIcon class="w-3" />
                            {{ $t('profiler.flame') }}
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
            class="flex-1 flex items-center justify-center p-6"
        >
            <EmptyState />
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
