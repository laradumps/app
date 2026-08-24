<script lang="ts" setup>
import { computed, onBeforeMount, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useScreenStore } from '@/store/screen';
import { useI18nStore } from '@/store/i18n';
import { useI18n } from 'vue-i18n';
import Screens from '@/components/screen/Screens.vue';
import ScreenContent from '@/components/screen/ScreenContent.vue';
import PauseBanner from '@/components/common/PauseBanner.vue';
import { usePayloadStore } from '@/store/payload';
import { useSettingsStore } from '@/store/settings';
import XDebugMode from '@/components/xdebug/XDebugMode.vue';
import { useXDebug } from '@/store/xdebug';
import { useSplitPanesStore } from '@/store/split-panes';
import { isSpecialEnvironment } from '@/constants';
import DropZones from '@/components/split/DropZones.vue';
import SplitPanes from '@/components/split/SplitPanes.vue';
import { useCurrentProject } from '@/store/current-project';
import { useIpcHandlers } from '@/composables/useIpcHandlers';
import { groupByTime } from '@/utils/dumpGrouping';

const screenStore = useScreenStore();
const payloadStore = usePayloadStore();
const settingsStore = useSettingsStore();
const xDebugStore = useXDebug();
const splitPanesStore = useSplitPanesStore();
const currentProjectStore = useCurrentProject();
const localeStore = useI18nStore();
const { locale } = useI18n({ useScope: 'global' });

const {
    environments,
    yamlConfig,
    inScreenWindow,
    payloadScreen,
    jobScreen,
    mailScreen,
    logScreen,
    brainScreen,
    xdebugMode,
    dumpsBagFiltered,
    toggleScreen,
    openScreenWindow,
    handleEnvironmentSelected,
    handleRemoveEnvironmentScreen,
    enableTailLog,
    disableTailLog,
    registerListeners,
    clearListeners
} = useIpcHandlers();

const isDraggingScreen = ref(false);
const draggedScreenName = ref('');

const isVerticalLayout = computed(() => settingsStore.settings.screen_layout === 'vertical');

watch(
    () => currentProjectStore.projectInfo,
    (newProject, oldProject) => {
        if (newProject && newProject.path !== oldProject?.path) {
            environments.value.forEach((env) => {
                if (!isSpecialEnvironment(env.value)) {
                    screenStore.remove(env.value);
                    payloadStore.clear(env.value);
                }
            });
            environments.value = [];
            window.ipcRenderer.send('storage.get-yaml', newProject.path);
        }
    }
);

watch(
    () => settingsStore.settings.tail_log_enabled,
    (enabled) => {
        if (enabled) {
            enableTailLog();
        } else {
            disableTailLog();
        }
    }
);

onBeforeMount(() => {
    locale.value = localeStore.value;
});

onBeforeUnmount(() => {
    clearListeners();
});

onMounted(() => {
    registerListeners();
});

const groupedDumps = computed(() => {
    if (!settingsStore.settings.grouped_by_time) {
        return { ungrouped: dumpsBagFiltered.value };
    }
    return groupByTime(dumpsBagFiltered.value);
});

const groupedSplitDumps = computed(() => {
    if (!splitPanesStore.splitConfig?.screenName) {
        return {};
    }
    const screenPayloads = payloadStore.get(splitPanesStore.splitConfig.screenName);
    if (!settingsStore.settings.grouped_by_time) {
        return { ungrouped: screenPayloads };
    }
    return groupByTime(screenPayloads);
});

const screenWindowItems = computed(() => {
    if (!inScreenWindow.value) return [];
    const screen = inScreenWindow.value;
    if (screen === 'jobs') return jobScreen.value;
    if (screen === 'mail') return mailScreen.value;
    if (screen === 'logs') return logScreen.value;
    if (screen === 'brain') return brainScreen.value;
    return payloadScreen.value;
});

const handleDragScreen = ({ screen, _ }) => {
    draggedScreenName.value = screen;
    isDraggingScreen.value = true;
};

const handleDropZone = (zone: 'right' | 'bottom') => {
    if (!draggedScreenName.value) return;
    const orientation = zone === 'right' ? 'vertical' : 'horizontal';
    splitPanesStore.setSplit(draggedScreenName.value, orientation);
    settingsStore.setSplitPaneScreen(draggedScreenName.value);
    screenStore.hidden(draggedScreenName.value);
    if (screenStore.screen === draggedScreenName.value) {
        const nextScreen = screenStore.getNext(draggedScreenName.value);
        if (nextScreen) {
            toggleScreen(nextScreen.screen_name, true);
        }
    }
    isDraggingScreen.value = false;
    draggedScreenName.value = '';
};

const handleCloseSplit = () => {
    const splitScreenName = splitPanesStore.splitConfig?.screenName;
    splitPanesStore.clearSplit();
    settingsStore.setSplitPaneScreen(null);
    if (splitScreenName) {
        screenStore.toggleVisible(splitScreenName);
        toggleScreen(splitScreenName, true);
    }
};

const handleDragEnd = () => {
    setTimeout(() => {
        if (isDraggingScreen.value) {
            isDraggingScreen.value = false;
            draggedScreenName.value = '';
        }
    }, 100);
};
</script>

<template>
    <div
        :class="{ absolute: !inScreenWindow }"
        class="flex overflow-hidden flex-col flex-1 right-0 left-0 h-fill-available"
        @dragend="handleDragEnd"
    >
        <DropZones
            :is-dragging="isDraggingScreen"
            @drop="handleDropZone"
        />

        <div
            v-if="inScreenWindow"
            class="mt-3 h-[calc(100vh-50px)] w-screen text-base flex flex-col"
        >
            <PauseBanner />
            <div class="flex-1 overflow-y-auto min-h-0">
                <ScreenContent
                    :screen-name="inScreenWindow"
                    mode="screen-window"
                    :yaml-config="yamlConfig"
                    :screen-window-items="screenWindowItems"
                />
            </div>
        </div>

        <div v-else>
            <XDebugMode v-if="xdebugMode && xDebugStore.current && xDebugStore.current.project_path" />

            <div
                v-else-if="splitPanesStore.splitConfig?.active"
                class="fixed inset-0 top-10.25 flex flex-col"
            >
                <SplitPanes
                    :orientation="splitPanesStore.splitConfig.orientation"
                    @close="handleCloseSplit"
                >
                    <template #pane-a>
                        <div class="flex flex-col h-full">
                            <div class="shrink-0 z-380">
                                <div class="flex h-12 px-1.5 items-center justify-between w-full">
                                    <Screens
                                        class="flex-1 min-w-0"
                                        :environments="environments"
                                        @toggleScreen="toggleScreen"
                                        @dragScreen="handleDragScreen"
                                        @environmentSelected="handleEnvironmentSelected"
                                        @removeEnvironmentScreen="handleRemoveEnvironmentScreen"
                                        @openScreenWindow="openScreenWindow"
                                    />
                                </div>
                            </div>
                            <PauseBanner />
                            <div class="flex-1 overflow-auto min-h-0">
                                <ScreenContent
                                    :screen-name="screenStore.screen"
                                    mode="split-pane"
                                    :yaml-config="yamlConfig"
                                    :dumps-bag-filtered="dumpsBagFiltered"
                                    :grouped-dumps="groupedDumps"
                                    :empty-screen-exclude="[
                                        'jobs',
                                        'mail',
                                        'logs',
                                        'queries',
                                        'brain',
                                        'profiler',
                                        'tail_logs'
                                    ]"
                                />
                            </div>
                        </div>
                    </template>

                    <template #pane-b>
                        <div class="flex flex-col h-full overflow-hidden">
                            <div
                                class="shrink-0 h-12 flex items-center justify-end px-3 border-b border-base-content/5"
                            >
                                <button
                                    @click="handleCloseSplit"
                                    class="btn border border-base-content/5 btn-sm p-2 btn-circle btn-soft"
                                    aria-label="Close split"
                                    title="Close split"
                                >
                                    <svg
                                        class="w-4 h-4"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="2"
                                            d="M6 18L18 6M6 6l12 12"
                                        ></path>
                                    </svg>
                                </button>
                            </div>
                            <div class="flex-1 overflow-auto min-h-0">
                                <ScreenContent
                                    :screen-name="splitPanesStore.splitConfig.screenName"
                                    mode="split-pane"
                                    :yaml-config="yamlConfig"
                                    :hide-header="true"
                                    :open-screen-window="openScreenWindow"
                                    :dumps-bag-filtered="dumpsBagFiltered"
                                    :grouped-dumps="groupedSplitDumps"
                                />
                            </div>
                        </div>
                    </template>
                </SplitPanes>
            </div>

            <div v-else>
                <div class="flex flex-col flex-1 absolute inset-0 overflow-hidden">
                    <main
                        class="flex flex-1 h-full min-h-0"
                        :class="isVerticalLayout ? 'flex-row' : 'flex-col'"
                    >
                        <div
                            class="shrink-0 z-50"
                            :class="isVerticalLayout ? 'h-full w-48 border-r border-base-content/5' : ''"
                        >
                            <div
                                class="flex px-1.5 w-full"
                                :class="
                                    isVerticalLayout
                                        ? 'flex-col h-full py-1.5'
                                        : 'h-12 items-center justify-between'
                                "
                            >
                                <Screens
                                    class="flex-1 min-w-0"
                                    :environments="environments"
                                    @toggleScreen="toggleScreen"
                                    @dragScreen="handleDragScreen"
                                    @environmentSelected="handleEnvironmentSelected"
                                    @removeEnvironmentScreen="handleRemoveEnvironmentScreen"
                                    @openScreenWindow="openScreenWindow"
                                />
                            </div>
                        </div>
                        <div class="flex flex-col flex-1 min-w-0 min-h-0">
                            <PauseBanner />
                            <div class="flex-1 overflow-y-auto min-h-0">
                            <ScreenContent
                                :screen-name="screenStore.screen"
                                mode="normal"
                                :yaml-config="yamlConfig"
                                :extra-class="isVerticalLayout ? 'w-full text-base' : 'w-screen text-base'"
                                :open-screen-window="openScreenWindow"
                                :dumps-bag-filtered="dumpsBagFiltered"
                                :grouped-dumps="groupedDumps"
                                :empty-screen-exclude="[
                                    'jobs',
                                    'mail',
                                    'logs',
                                    'queries',
                                    'tail_logs',
                                    'profiler',
                                    'brain'
                                ]"
                            />
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </div>
    </div>
</template>
