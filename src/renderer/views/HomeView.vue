<script lang="ts" setup>
import { computed, onBeforeMount, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useScreenStore } from '@/store/screen';
import { useI18nStore } from '@/store/i18n';
import { useI18n } from 'vue-i18n';
import { Payload } from '@/types/Payload';
import DumpItem from '@/components/dumps/DumpItem.vue';
import WelcomePage from '@/components/app/WelcomePage.vue';
import Screens from '@/components/screen/Screens.vue';
import DumpLivewire from '@/components/laravel/DumpLivewire.vue';
import ScreenWindow from '@/components/screen/ScreenWindow.vue';
import PauseBanner from '@/components/app/PauseBanner.vue';
import { usePayloadStore } from '@/store/payload';
import { useSettingsStore } from '@/store/settings';
import XDebugMode from '@/components/xdebug/XDebugMode.vue';
import { useXDebug } from '@/store/xdebug';
import JobView from '@/components/laravel/JobView.vue';
import MailView from '@/components/laravel/MailView.vue';
import LogView from '@/components/laravel/LogView.vue';
import TailLogView from '@/components/laravel/TailLogView.vue';
import CacheGateView from '@/components/laravel/CacheGateView.vue';
import QueriesView from '@/components/laravel/QueriesView.vue';
import { useSplitPanesStore } from '@/store/split-panes';
import BrainView from '@/components/laravel/BrainView.vue';
import ProfileView from '@/components/laravel/ProfileView.vue';
import { ClockIcon } from '@heroicons/vue/24/outline';
import { groupByTime } from '@/utils/dumpGrouping';
import { isSpecialEnvironment } from '@/constants';
import SvgEmpty from '@/components/svg/SvgEmpty.vue';
import { Environment } from '../../main/storage';
import DropZones from '@/components/split/DropZones.vue';
import SplitPanes from '@/components/split/SplitPanes.vue';
import { useCurrentProject } from '@/store/current-project';
import dayjs from 'dayjs';
import { useIpcHandlers } from '@/composables/useIpcHandlers';

const screenStore = useScreenStore();
const payloadStore = usePayloadStore();
const settingsStore = useSettingsStore();
const xDebugStore = useXDebug();
const splitPanesStore = useSplitPanesStore();
const pausePayloadStore = usePausePayloadStore();
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
    queriesScreen,
    brainScreen,
    xdebugMode,
    dumpsBagFiltered,
    addScreen,
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

const hasColorsInPayload = computed((): boolean => {
    return payloadStore.payload.some((payload: Payload) => payload.color && payload.color !== 'gray');
});

const handleDragScreen = ({ screen, _ }) => {
    draggedScreenName.value = screen;
    isDraggingScreen.value = true;
};

const handleDropZone = (zone: 'right' | 'bottom') => {
    if (!draggedScreenName.value) {
        return;
    }

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
            class="mt-3 h-[calc(100vh-50px)] w-screen text-base"
        >
            <PauseBanner />

            <ScreenWindow
                v-if="
                    !['jobs', 'mail', 'logs', 'queries', 'brain', 'cache', 'gate', 'profiler'].includes(inScreenWindow)
                "
                v-model:dumps="payloadScreen"
                v-model:screen="inScreenWindow"
            />

            <CacheGateView
                v-if="inScreenWindow === 'cache'"
                screen="cache"
                :in-screen-window="inScreenWindow.length > 0"
                :items="payloadScreen"
            />

            <CacheGateView
                v-if="inScreenWindow === 'gate'"
                screen="gate"
                :in-screen-window="inScreenWindow.length > 0"
                :items="payloadScreen"
            />

            <JobView
                :in-screen-window="inScreenWindow.length > 0"
                v-if="inScreenWindow === 'jobs'"
                :items="jobScreen"
            />

            <BrainView
                :in-screen-window="inScreenWindow.length > 0"
                v-if="inScreenWindow === 'brain'"
                :items="brainScreen"
            />

            <ProfileView
                :in-screen-window="inScreenWindow.length > 0"
                v-if="inScreenWindow === 'profiler'"
                :yaml-config="yamlConfig"
            />

            <MailView
                :in-screen-window="inScreenWindow.length > 0"
                v-if="inScreenWindow === 'mail'"
                :items="mailScreen"
            />

            <LogView
                :in-screen-window="inScreenWindow.length > 0"
                v-if="inScreenWindow === 'logs'"
                :items="logScreen"
                :yaml-config="yamlConfig"
            />
        </div>

        <div v-else>
            <XDebugMode v-if="xdebugMode && xDebugStore.current && xDebugStore.current.project_path" />

            <div v-else>
                <div
                    v-if="splitPanesStore.splitConfig?.active"
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
                                    <div v-if="screenStore.screen === 'jobs'">
                                        <JobView />
                                    </div>

                                    <div v-else-if="screenStore.screen === 'brain'">
                                        <BrainView />
                                    </div>

                                    <div v-else-if="screenStore.screen === 'profiler'">
                                        <ProfileView :yaml-config="yamlConfig" />
                                    </div>

                                    <div v-else-if="screenStore.screen === 'mail'">
                                        <MailView />
                                    </div>

                                    <div v-else-if="screenStore.screen === 'logs'">
                                        <LogView :yaml-config="yamlConfig" />
                                    </div>

                                    <div v-else-if="screenStore.screen === 'tail_logs'">
                                        <TailLogView />
                                    </div>

                                    <div v-else-if="screenStore.screen === 'queries'">
                                        <QueriesView :yaml-config="yamlConfig" />
                                    </div>

                                    <div v-else-if="screenStore.screen === 'cache'">
                                        <CacheGateView screen="cache" />
                                    </div>

                                    <div v-else-if="screenStore.screen === 'gate'">
                                        <CacheGateView screen="gate" />
                                    </div>

                                    <div
                                        v-else
                                        class="flex flex-col rounded-sm text-base w-full h-full"
                                    >
                                        <!--                                        <HeaderColorsFilter v-if="hasColorsInPayload" />-->

                                        <div id="top"></div>

                                        <div class="w-full">
                                            <div
                                                id="dumps-base"
                                                class="w-full mb-10"
                                                v-if="payloadStore.payload.length > 0"
                                                :class="{
                                                    'flex flex-col-reverse':
                                                        settingsStore.settings.dump_order === 'normal'
                                                }"
                                            >
                                                <div
                                                    v-for="(group, groupKey) in groupedDumps"
                                                    :key="groupKey"
                                                    class="w-full"
                                                >
                                                    <div
                                                        v-if="
                                                            !['livewire'].includes(screenStore.screen) &&
                                                            settingsStore.settings.grouped_by_time
                                                        "
                                                        class="bg-base-200 flex-1 text-left px-4 py-1.5 z-70 text-xs sticky top-0"
                                                    >
                                                        <span
                                                            class="flex items-center gap-1 opacity-70"
                                                            :title="groupKey"
                                                        >
                                                            <ClockIcon class="w-3 h-3" />
                                                            {{ dayjs(groupKey).format('HH:mm:ss') }}
                                                        </span>
                                                    </div>

                                                    <div
                                                        v-for="(payload, index) in settingsStore.settings.dump_order ===
                                                        'normal'
                                                            ? group.slice().reverse()
                                                            : group"
                                                        :key="payload.sf_dump_id"
                                                        :id="payload.id"
                                                        class="w-full"
                                                    >
                                                        <DumpItem
                                                            class="w-full group text-sm"
                                                            v-show="screenStore.screen !== 'livewire'"
                                                            :payload="payload"
                                                            :show-time="!settingsStore.settings.grouped_by_time"
                                                            :is-first="index === 0"
                                                        />
                                                    </div>
                                                </div>

                                                <DumpLivewire v-if="screenStore.screen === 'livewire'" />
                                            </div>

                                            <div
                                                v-if="
                                                    dumpsBagFiltered.length === 0 &&
                                                    ![
                                                        'jobs',
                                                        'mail',
                                                        'logs',
                                                        'queries',
                                                        'home',
                                                        'brain',
                                                        'profiler',
                                                        'tail_logs'
                                                    ].includes(screenStore.screen)
                                                "
                                                class="flex items-center justify-center w-full h-full py-20"
                                            >
                                                <div class="text-center">
                                                    <SvgEmpty class="w-30 opacity-25 mx-auto" />
                                                    <div class="text-base-content/70">
                                                        <h1 class="text-lg font-semibold mb-2">{{ $t('empty') }}</h1>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div id="bottom"></div>

                                        <WelcomePage
                                            v-if="payloadStore.payload.length === 0 && screenStore.screen === 'home'"
                                            class="w-full h-full"
                                        />
                                    </div>
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
                                    <div v-if="splitPanesStore.splitConfig.screenName === 'jobs'">
                                        <JobView
                                            hide-header
                                            @open-screen-window="openScreenWindow"
                                        />
                                    </div>

                                    <div v-else-if="splitPanesStore.splitConfig.screenName === 'brain'">
                                        <BrainView
                                            hide-header
                                            @open-screen-window="openScreenWindow"
                                        />
                                    </div>

                                    <div v-else-if="splitPanesStore.splitConfig.screenName === 'profiler'">
                                        <ProfileView
                                            hide-header
                                            :yaml-config="yamlConfig"
                                            @open-screen-window="openScreenWindow"
                                        />
                                    </div>

                                    <div v-else-if="splitPanesStore.splitConfig.screenName === 'mail'">
                                        <MailView
                                            hide-header
                                            @open-screen-window="openScreenWindow"
                                        />
                                    </div>

                                    <div v-else-if="splitPanesStore.splitConfig.screenName === 'logs'">
                                        <LogView
                                            hide-header
                                            :yaml-config="yamlConfig"
                                            @open-screen-window="openScreenWindow"
                                        />
                                    </div>

                                    <div v-else-if="splitPanesStore.splitConfig.screenName === 'tail_logs'">
                                        <TailLogView hide-header />
                                    </div>

                                    <div v-else-if="splitPanesStore.splitConfig.screenName === 'queries'">
                                        <QueriesView
                                            hide-header
                                            :yaml-config="yamlConfig"
                                            @open-screen-window="openScreenWindow"
                                        />
                                    </div>

                                    <div v-else-if="splitPanesStore.splitConfig.screenName === 'cache'">
                                        <CacheGateView
                                            screen="cache"
                                            hide-header
                                        />
                                    </div>

                                    <div v-else-if="splitPanesStore.splitConfig.screenName === 'gate'">
                                        <CacheGateView
                                            screen="gate"
                                            hide-header
                                        />
                                    </div>

                                    <div
                                        v-else
                                        class="px-3"
                                    >
                                        <div
                                            v-if="payloadStore.get(splitPanesStore.splitConfig.screenName).length === 0"
                                            class="flex items-center justify-center h-full py-20"
                                        >
                                            <div class="text-center">
                                                <SvgEmpty class="w-30 opacity-25 mx-auto" />
                                                <div class="text-base-content/70">
                                                    <h1 class="text-lg font-semibold mb-2">{{ $t('empty') }}</h1>
                                                </div>
                                            </div>
                                        </div>

                                        <div
                                            v-else
                                            :class="{
                                                'flex flex-col-reverse': settingsStore.settings.dump_order === 'normal'
                                            }"
                                        >
                                            <div
                                                v-for="(group, groupKey) in groupedSplitDumps"
                                                :key="groupKey"
                                                class="w-full"
                                            >
                                                <div
                                                    v-if="
                                                        !['livewire'].includes(
                                                            splitPanesStore.splitConfig.screenName
                                                        ) && settingsStore.settings.grouped_by_time
                                                    "
                                                    class="bg-base-200 flex-1 text-left px-4 py-1.5 z-70 text-xs sticky top-0"
                                                >
                                                    <span
                                                        class="flex items-center gap-1 opacity-70"
                                                        :title="groupKey"
                                                    >
                                                        <ClockIcon class="w-3 h-3" />
                                                        {{ dayjs(groupKey).format('HH:mm:ss') }}
                                                    </span>
                                                </div>

                                                <div
                                                    v-for="(payload, index) in settingsStore.settings.dump_order ===
                                                    'normal'
                                                        ? group.slice().reverse()
                                                        : group"
                                                    :key="payload.sf_dump_id"
                                                    class="w-full mb-3"
                                                >
                                                    <DumpItem
                                                        class="w-full group text-sm"
                                                        :payload="payload"
                                                        :show-time="!settingsStore.settings.grouped_by_time"
                                                        :is-first="index === 0"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </template>
                    </SplitPanes>
                </div>

                <div v-else>
                    <div class="flex flex-col flex-1 absolute inset-0 overflow-hidden">
                        <main class="flex flex-col flex-1 min-h-full space-y-1">
                            <div class="flex z-50">
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
 
                            <div v-if="screenStore.screen === 'cache'">
                                <CacheGateView
                                    screen="cache"
                                    class="w-screen text-base"
                                />
                            </div>

                            <div v-else-if="screenStore.screen === 'gate'">
                                <CacheGateView
                                    screen="gate"
                                    class="w-screen text-base"
                                />
                            </div>

                            <div v-else-if="screenStore.screen === 'jobs'">
                                <JobView
                                    class="w-screen text-base"
                                    @open-screen-window="openScreenWindow"
                                />
                            </div>

                            <div v-else-if="screenStore.screen === 'mail'">
                                <MailView
                                    class="w-screen text-base"
                                    @open-screen-window="openScreenWindow"
                                />
                            </div>

                            <div v-else-if="screenStore.screen === 'logs'">
                                <LogView
                                    class="w-screen text-base"
                                    :yaml-config="yamlConfig"
                                    @open-screen-window="openScreenWindow"
                                />
                            </div>

                            <div v-else-if="screenStore.screen === 'tail_logs'">
                                <TailLogView class="w-screen text-base" />
                            </div>

                            <div v-else-if="screenStore.screen === 'queries'">
                                <QueriesView
                                    class="text-base"
                                    :yaml-config="yamlConfig"
                                    @open-screen-window="openScreenWindow"
                                />
                            </div>

                            <div v-else-if="screenStore.screen === 'brain'">
                                <BrainView
                                    class="w-screen text-base"
                                    @open-screen-window="openScreenWindow"
                                />
                            </div>

                            <div v-else-if="screenStore.screen === 'profiler'">
                                <ProfileView
                                    class="w-screen text-base"
                                    :yaml-config="yamlConfig"
                                    @open-screen-window="openScreenWindow"
                                />
                            </div>

                            <div
                                v-else-if="
                                    ![
                                        'cache',
                                        'gate',
                                        'jobs',
                                        'mail',
                                        'logs',
                                        'queries',
                                        'tail_logs',
                                        'brain',
                                        'profiler'
                                    ].includes(screenStore.screen)
                                "
                                :class="{
                                    'items-center': payloadStore.payload.length === 0,
                                    'h-[calc(100vh-90px)]': true
                                }"
                                class="flex flex-col rounded-sm text-base w-screen overflow-auto"
                            >
                                <!--  <HeaderColorsFilter v-if="hasColorsInPayload" />-->

                                <div id="top"></div>

                                <div
                                    :class="{
                                        'w-full': dumpsBagFiltered.length === 0 && screenStore.screen !== 'home'
                                    }"
                                >
                                    <div
                                        id="dumps-base"
                                        class="w-full mb-10"
                                        v-if="payloadStore.payload.length > 0"
                                        :class="{
                                            'flex flex-col-reverse': settingsStore.settings.dump_order === 'normal'
                                        }"
                                    >
                                        <div
                                            v-for="(group, groupKey, index) in groupedDumps"
                                            :key="groupKey"
                                            class="w-full"
                                            :class="{
                                                '-mt-1': index === 0
                                            }"
                                        >
                                            <div
                                                v-if="
                                                    !['livewire'].includes(screenStore.screen) &&
                                                    settingsStore.settings.grouped_by_time
                                                "
                                                class="bg-base-200 flex-1 text-left px-4 py-1.5 z-70 text-xs sticky -top-2"
                                            >
                                                <span
                                                    class="flex items-center gap-1 opacity-70"
                                                    :title="groupKey"
                                                >
                                                    <ClockIcon class="w-3 h-3" />
                                                    {{ dayjs(groupKey).format('HH:mm:ss') }}
                                                </span>
                                            </div>

                                            <div
                                                v-for="(payload, index) in settingsStore.settings.dump_order ===
                                                'normal'
                                                    ? group.slice().reverse()
                                                    : group"
                                                :key="payload.sf_dump_id"
                                                :id="payload.id"
                                                class="w-full"
                                                :class="{
                                                    '-mt-3': settingsStore.settings.grouped_by_time && index === 0
                                                }"
                                            >
                                                <DumpItem
                                                    class="w-full group text-sm"
                                                    v-show="screenStore.screen !== 'livewire'"
                                                    :payload="payload"
                                                    :show-time="!settingsStore.settings.grouped_by_time"
                                                    :is-first="index === 0"
                                                />
                                            </div>
                                        </div>

                                        <DumpLivewire v-if="screenStore.screen === 'livewire'" />
                                    </div>

                                    <div
                                        v-if="
                                            dumpsBagFiltered.length === 0 &&
                                            ![
                                                'jobs',
                                                'mail',
                                                'logs',
                                                'queries',
                                                'home',
                                                'tail_logs',
                                                'profiler',
                                                'brain'
                                            ].includes(screenStore.screen)
                                        "
                                        class="-mt-22.5 -ml-8 absolute flex items-center justify-center w-full pointer-events-none"
                                        style="height: -webkit-fill-available"
                                    >
                                        <SvgEmpty class="w-30 opacity-25" />
                                        <div class="text-base-content/70">
                                            <h1 class="text-lg font-semibold mb-2">{{ $t('empty') }}</h1>
                                        </div>
                                    </div>
                                </div>

                                <div id="bottom"></div>

                                <WelcomePage
                                    v-if="payloadStore.payload.length === 0 && screenStore.screen === 'home'"
                                    class="w-full h-full"
                                />
                            </div>
                        </main>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
