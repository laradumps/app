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
import { isKnownScreen, isSpecialEnvironment } from '@/constants';
import DropZones from '@/components/split/DropZones.vue';
import SplitPanes from '@/components/split/SplitPanes.vue';
import IconButton from '@/components/common/IconButton.vue';
import { XMarkIcon } from '@heroicons/vue/24/outline';
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
const hasNavbar = new URLSearchParams(window.location.search).get('screen') === 'default';
const tabsInPlace = computed(() => isVerticalLayout.value || !hasNavbar);

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

const group = (items) => (settingsStore.settings.grouped_by_time ? groupByTime(items) : { ungrouped: items });

const groupedDumps = computed(() => group(dumpsBagFiltered.value));

const groupedSplitDumps = computed(() => {
    if (!splitPanesStore.splitConfig?.screenName) {
        return {};
    }
    return group(payloadStore.get(splitPanesStore.splitConfig.screenName));
});

const screenWindowItems = computed(() => {
    if (!inScreenWindow.value) return [];
    const screen = inScreenWindow.value;
    if (screen === 'jobs') return jobScreen.value;
    if (screen === 'mail') return mailScreen.value;
    if (screen === 'logs') return logScreen.value;
    if (screen === 'brain') return brainScreen.value;
    return payloadScreen.value ?? [];
});

const groupedScreenWindowDumps = computed(() =>
    isKnownScreen(inScreenWindow.value ?? '') ? {} : group(screenWindowItems.value)
);

const handleDragScreen = ({ screen, _ }) => {
    draggedScreenName.value = screen;
    isDraggingScreen.value = true;
};

const handleDropZone = (zone: 'right' | 'bottom') => {
    if (!draggedScreenName.value) return;

    const previousSplitScreen = splitPanesStore.splitConfig?.screenName;
    if (previousSplitScreen && previousSplitScreen !== draggedScreenName.value) {
        screenStore.toggleVisible(previousSplitScreen);
    }

    const orientation = zone === 'right' ? 'vertical' : 'horizontal';
    splitPanesStore.setSplit(draggedScreenName.value, orientation);
    settingsStore.setSplitPaneScreen(draggedScreenName.value, orientation);
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

const handleSplitResize = ({ splitPosition }: { splitPosition: number }) => {
    settingsStore.setSplitPaneSize(splitPosition);
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
            <div
                class="flex-1 min-h-0"
                :class="isKnownScreen(inScreenWindow) ? 'overflow-hidden' : 'overflow-y-auto'"
            >
                <ScreenContent
                    :screen-name="inScreenWindow"
                    mode="screen-window"
                    extra-class="w-full h-full min-h-0 text-base"
                    :yaml-config="yamlConfig"
                    :screen-window-items="screenWindowItems"
                    :dumps-bag-filtered="isKnownScreen(inScreenWindow) ? undefined : screenWindowItems"
                    :grouped-dumps="groupedScreenWindowDumps"
                />
            </div>
        </div>

        <div v-else>
            <XDebugMode v-if="xdebugMode && xDebugStore.current && xDebugStore.current.project_path" />

            <div
                v-else-if="splitPanesStore.splitConfig?.active"
                class="absolute inset-0 flex flex-col"
            >
                <SplitPanes
                    :orientation="splitPanesStore.splitConfig.orientation"
                    :initial-split="settingsStore.settings.split_pane_size ?? 50"
                    @close="handleCloseSplit"
                    @resize="handleSplitResize"
                >
                    <template #pane-a>
                        <div class="flex flex-col h-full">
                            <div
                                class="shrink-0 z-380"
                                :class="{ 'flex h-12 px-1.5 items-center': isVerticalLayout }"
                            >
                                <Teleport
                                    defer
                                    to="#navbar-views"
                                    :disabled="tabsInPlace"
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
                                </Teleport>
                            </div>
                            <div
                                class="flex-1 min-h-0"
                                :class="isKnownScreen(screenStore.screen) ? 'overflow-hidden' : 'overflow-auto'"
                            >
                                <ScreenContent
                                    :screen-name="screenStore.screen"
                                    mode="split-pane"
                                    extra-class="w-full h-full min-h-0 text-base"
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
                                class="shrink-0 h-9 flex items-center justify-between pl-3 pr-1 border-b border-base-content/10 text-[0.8rem] font-medium capitalize"
                            >
                                {{ splitPanesStore.splitConfig.screenName.replace(/_/g, ' ') }}
                                <IconButton
                                    label="Close split"
                                    variant="danger"
                                    @click="handleCloseSplit"
                                >
                                    <XMarkIcon class="w-4 h-4" />
                                </IconButton>
                            </div>
                            <div
                                class="flex-1 min-h-0"
                                :class="
                                    isKnownScreen(splitPanesStore.splitConfig.screenName)
                                        ? 'overflow-hidden'
                                        : 'overflow-auto'
                                "
                            >
                                <ScreenContent
                                    :screen-name="splitPanesStore.splitConfig.screenName"
                                    mode="split-pane"
                                    extra-class="w-full h-full min-h-0 text-base"
                                    :yaml-config="yamlConfig"
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
                            :class="
                                isVerticalLayout
                                    ? 'shrink-0 z-50 flex flex-col h-full w-48 px-1.5 py-1.5 border-r border-base-content/10'
                                    : ''
                            "
                        >
                            <Teleport
                                defer
                                to="#navbar-views"
                                :disabled="tabsInPlace"
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
                            </Teleport>
                        </div>
                        <div class="flex flex-col flex-1 min-w-0 min-h-0">
                            <div
                                class="flex flex-col flex-1 min-h-0"
                                :class="isKnownScreen(screenStore.screen) ? 'overflow-hidden' : 'overflow-y-auto'"
                            >
                                <ScreenContent
                                    :screen-name="screenStore.screen"
                                    mode="normal"
                                    :yaml-config="yamlConfig"
                                    extra-class="w-full h-full min-h-0 text-base"
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
