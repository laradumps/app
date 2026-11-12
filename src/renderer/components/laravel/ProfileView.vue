<script setup lang="ts">
import { computed, ref } from 'vue';
import { useProfileStore, type ProfileEntry } from '@/store/profile';
import { useCurrentProject } from '@/store/current-project';
import { ClockIcon, CogIcon, FireIcon, Square3Stack3DIcon, PlayIcon } from '@heroicons/vue/24/outline';
import EmptyState from '@/components/common/EmptyState.vue';
import ViewToolbar from '@/components/common/ViewToolbar.vue';
import IconButton from '@/components/common/IconButton.vue';
import PauseBanner from '@/components/common/PauseBanner.vue';
import IconPause from '@/components/Icons/IconPause.vue';
import { usePauseProfileStore } from '@/store/pauses';
import { formatDuration, parseLabel } from './profile/profileHelpers';
import ProfileLegend from './profile/ProfileLegend.vue';
import ProfileTimeline from './profile/ProfileTimeline.vue';
import ProfileHotspots from './profile/ProfileHotspots.vue';
import ProfileFlame from './profile/ProfileFlame.vue';
import RequestSwitcher from '@/components/common/RequestSwitcher.vue';
import MenuRow from '@/components/navbar/MenuRow.vue';
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
const hasProfile = computed(() => profiles.value.length > 0 && !!selectedProfile.value);

const selectedEntry = ref<ProfileEntry | null>(null);

const profileItems = computed(() =>
    profiles.value.map((profile) => {
        const { method, path } = parseLabel(profile.label);
        return {
            id: profile.id,
            method,
            label: path,
            date: profile.date_time,
            count: profile.summary.total_entries,
            duration: profile.total_duration_ms
        };
    })
);

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

const selectProfile = (id: string | null | undefined) => id && profileStore.selectProfile(id);

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
    <div class="flex flex-col h-full min-h-0">
        <!-- Actions Bar -->
        <ViewToolbar
            :can-clear="profiles.length > 0"
            :on-clear="hideHeader ? undefined : clear"
            v-if="!hideHeader || hasProfile"
            :count="hasProfile ? undefined : profiles.length"
            noun="profile"
        >
            <template
                v-if="hasProfile"
                #title
            >
                <RequestSwitcher
                    :items="profileItems"
                    :count-label="$t('profiler.entries')"
                    :model-value="profileStore.selectedProfileId"
                    @update:model-value="selectProfile"
                >
                    <div class="flex items-center gap-2">
                        <div class="flex p-0.5 rounded-md bg-base-content/5">
                            <button
                                class="inline-flex items-center gap-1 h-6 px-2 rounded text-xs cursor-pointer transition-colors"
                                :class="
                                    viewMode === 'timeline'
                                        ? 'bg-base-content/15 text-base-content'
                                        : 'text-base-content/50 hover:text-base-content'
                                "
                                :aria-label="$t('profiler.timeline')"
                                :title="$t('profiler.timeline')"
                                @click="viewMode = 'timeline'"
                            >
                                <ClockIcon class="w-3" />
                                <span class="@max-xl:hidden">{{ $t('profiler.timeline') }}</span>
                            </button>
                            <button
                                class="inline-flex items-center gap-1 h-6 px-2 rounded text-xs cursor-pointer transition-colors"
                                :class="
                                    viewMode === 'hotspots'
                                        ? 'bg-base-content/15 text-base-content'
                                        : 'text-base-content/50 hover:text-base-content'
                                "
                                :aria-label="$t('profiler.hotspots')"
                                :title="$t('profiler.hotspots')"
                                @click="viewMode = 'hotspots'"
                            >
                                <FireIcon class="w-3" />
                                <span class="@max-xl:hidden">{{ $t('profiler.hotspots') }}</span>
                            </button>
                            <button
                                class="inline-flex items-center gap-1 h-6 px-2 rounded text-xs cursor-pointer transition-colors"
                                :class="
                                    viewMode === 'flame'
                                        ? 'bg-base-content/15 text-base-content'
                                        : 'text-base-content/50 hover:text-base-content'
                                "
                                :aria-label="$t('profiler.flame')"
                                :title="$t('profiler.flame')"
                                @click="viewMode = 'flame'"
                            >
                                <Square3Stack3DIcon class="w-3" />
                                <span class="@max-xl:hidden">{{ $t('profiler.flame') }}</span>
                            </button>
                        </div>
                        <span class="text-base-content/25">·</span>
                        <span>
                            {{ formatDuration(selectedProfile.total_duration_ms) }}
                        </span>
                    </div>
                </RequestSwitcher>
            </template>

            <template
                v-if="!hideHeader"
                #right
            >
                <!-- YAML Configuration Dropdown -->
                <div class="dropdown dropdown-bottom dropdown-end">
                    <IconButton
                        tabindex="0"
                        role="button"
                        label="Settings"
                        variant="base"
                    >
                        <CogIcon class="w-4" />
                    </IconButton>
                    <div
                        tabindex="0"
                        role="menu"
                        :aria-label="$t('settings.settings')"
                        class="dropdown-content mt-2 z-[200] w-56 max-h-[70vh] overflow-y-auto p-1 rounded-lg border border-base-content/10 bg-base-100 shadow-xl"
                    >
                        <template v-if="hasProfileConfig">
                            <MenuRow
                                toggle
                                :label="$t('profiler.enable_profiling')"
                                :model-value="profilingEnabled"
                                @update:model-value="toggleProfiling"
                            />

                            <template v-if="yamlProfileOptions.length > 0">
                                <div class="my-1 h-px bg-base-content/10"></div>
                                <p class="px-2 pt-1 pb-0.5 text-[0.7rem] text-base-content/45">
                                    {{ $t('profiler.options') }}
                                </p>
                                <MenuRow
                                    v-for="control in yamlProfileOptions"
                                    :key="control.key"
                                    toggle
                                    :label="control.label"
                                    :model-value="control.enabled"
                                    @update:model-value="toggleProfileOption(control.key, control.enabled)"
                                />
                            </template>

                            <template v-if="yamlCaptureOptions.length > 0">
                                <div class="my-1 h-px bg-base-content/10"></div>
                                <p class="px-2 pt-1 pb-0.5 text-[0.7rem] text-base-content/45">
                                    {{ $t('profiler.capture') }}
                                </p>
                                <MenuRow
                                    v-for="control in yamlCaptureOptions"
                                    :key="control.key"
                                    toggle
                                    :label="control.label"
                                    :model-value="control.enabled"
                                    @update:model-value="toggleCapture(control.key, control.enabled)"
                                />
                            </template>
                        </template>

                        <p
                            v-else
                            class="px-2 py-2 text-xs text-base-content/45"
                        >
                            {{ $t('profiler.no_configuration') }}
                        </p>
                    </div>
                </div>

                <!-- Pause -->
                <IconButton
                    :label="pauseProfile.is_paused ? $t('resume') : $t('pause')"
                    variant="base"
                    @click="pauseProfile.toggle()"
                >
                    <PlayIcon
                        v-if="pauseProfile.is_paused"
                        class="w-4 text-warning"
                    />
                    <IconPause
                        v-else
                        class="w-4"
                    />
                </IconButton>
            </template>
        </ViewToolbar>

        <!-- Pause Banner -->
        <PauseBanner :paused="pauseProfile.is_paused" />

        <!-- Profile Content -->
        <div
            v-if="hasProfile"
            class="flex-1 flex flex-col overflow-hidden min-h-0"
        >
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
            <EmptyState screen="profiler" />
        </div>

        <!-- Modals -->
        <ProfileEntryModal v-model="selectedEntry" />
    </div>
</template>
