<script setup lang="ts">
import { defineEmits, ref, computed, nextTick, onMounted, onUnmounted, useAttrs } from 'vue';

defineOptions({ inheritAttrs: false });

const attrs = useAttrs();
import { useScreenStore } from '@/store/screen';
import { usePayloadStore } from '@/store/payload';
import { useJobStore } from '@/store/jobs';
import { useMailStore } from '@/store/mail';
import { useLogStore } from '@/store/logs.js';
import { useTailLogStore } from '@/store/tail-log';
import { useQueriesPayloadStore } from '@/store/queries.js';
import { useSplitPanesStore } from '@/store/split-panes';
import { useBrainStore } from '@/store/brains.ts';
import { useProfileStore } from '@/store/profile';
import { useGlobalSearchStore } from '@/store/global-search';
import { useSettingsStore } from '@/store/settings';
import EnvironmentDropdown from './EnvironmentDropdown.vue';
import type { Environment } from '../../../main/storage';
import { PlusIcon, XMarkIcon } from '@heroicons/vue/20/solid';
import { screenIcon } from './screen-icons';
import { isSpecialEnvironment } from '@/constants';
import { matchesScreenSearch } from '@/utils/searchMatchers';

const props = defineProps<{
    environments?: Environment[];
}>();

const emit = defineEmits([
    'toggleScreen',
    'dragScreen',
    'environmentSelected',
    'removeEnvironmentScreen',
    'openScreenWindow'
]);

const screenStore = useScreenStore();
const payloadStore = usePayloadStore();
const jobStore = useJobStore();
const mailStore = useMailStore();
const logStore = useLogStore();
const tailLogStore = useTailLogStore();
const brainStore = useBrainStore();
const queriesStore = useQueriesPayloadStore();
const profileStore = useProfileStore();
const splitPanesStore = useSplitPanesStore();
const globalSearchStore = useGlobalSearchStore();
const settingsStore = useSettingsStore();

const isVertical = computed(() => settingsStore.settings.screen_layout === 'vertical');
const showIcons = computed(() => settingsStore.settings.show_screen_icons === true);

const disableTailLog = () => {
    settingsStore.settings.tail_log_enabled = false;
    settingsStore.update();
};

const showTooltip = ref(false);
const isDraggingIndex = ref(null);
const showEnvironmentDropdown = ref(false);
const tablistRef = ref<HTMLElement | null>(null);

// Context menu
const contextMenu = ref<{ visible: boolean; x: number; y: number; screenName: string }>({
    visible: false,
    x: 0,
    y: 0,
    screenName: ''
});

const screensWithNewWindow = ['jobs', 'mail', 'logs', 'brain'];

const onTabContextMenu = (e: MouseEvent, screenName: string) => {
    if (!screensWithNewWindow.includes(screenName)) return;
    e.preventDefault();
    contextMenu.value = { visible: true, x: e.clientX, y: e.clientY, screenName };
};

const closeContextMenu = () => {
    contextMenu.value.visible = false;
};

const onOpenScreenWindow = () => {
    emit('openScreenWindow', contextMenu.value.screenName);
    closeContextMenu();
};

const handleClickOutside = (e: MouseEvent) => {
    if (!(e.target as HTMLElement).closest('.screen-context-menu')) {
        closeContextMenu();
    }
};

const navigableScreens = () => screenStore.allVisible().filter((screen) => !isScreenInSplit(screen.screen_name));

const navigateScreens = (direction: 1 | -1) => {
    const list = navigableScreens();
    if (list.length <= 1) return;

    const currentIndex = list.findIndex((screen) => screen.screen_name === screenStore.screen);
    const nextIndex = (currentIndex + direction + list.length) % list.length;
    emit('toggleScreen', list[nextIndex].screen_name, true);
};

const focusActiveTab = () => {
    nextTick(() => tablistRef.value?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.focus());
};

const onKeydownNavigate = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    if (
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        (target && (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable))
    ) {
        return;
    }

    const keys: Record<string, 1 | -1> = isVertical.value
        ? { ArrowDown: 1, ArrowUp: -1 }
        : { ArrowRight: 1, ArrowLeft: -1 };
    const direction = keys[e.key];
    if (!direction) return;

    e.preventDefault();
    navigateScreens(direction);
    if (target?.closest('[role="tab"]')) focusActiveTab();
};

onMounted(() => {
    document.addEventListener('click', handleClickOutside);
    window.addEventListener('keydown', onKeydownNavigate);
});
onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside);
    window.removeEventListener('keydown', onKeydownNavigate);
});

const onWheelScroll = (e: WheelEvent) => {
    if (!tablistRef.value || isVertical.value) return;
    e.preventDefault();
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    tablistRef.value.scrollLeft += delta;
};

const availableEnvironments = computed(() => {
    if (!props.environments) return [];

    const ignoredEnvironment = isSpecialEnvironment;
    return props.environments.filter(
        (env) => !env.selected && !ignoredEnvironment(env.value) && !screenStore.get(env.value)
    );
});

const toggleEnvironmentDropdown = () => {
    showEnvironmentDropdown.value = !showEnvironmentDropdown.value;
};

const onEnvironmentSelected = (environment) => {
    emit('environmentSelected', environment);
    showEnvironmentDropdown.value = false;
};

const BUILT_IN_SCREENS = [
    'home',
    'queries',
    'logs',
    'tail_logs',
    'jobs',
    'mail',
    'brain',
    'livewire',
    'profiler',
    'xdebug_inspector'
];

const isEnvironmentScreen = (screenName) => {
    return (
        !BUILT_IN_SCREENS.includes(screenName.toLowerCase()) ||
        props.environments?.some((env) => env.value === screenName) ||
        false
    );
};

const removeEnvironmentScreen = (screenName) => {
    emit('removeEnvironmentScreen', screenName);
};

const onDragStart = (index, event, screen) => {
    isDraggingIndex.value = index;
    showTooltip.value = true;

    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', screen.screen_name);

    emit('dragScreen', { screen: screen.screen_name, event });
};

const onDragEnd = (event, screen) => {
    isDraggingIndex.value = null;
    showTooltip.value = false;
};

window.ipcRenderer.on('screen-window:xdebug-closed', (event, args) => {
    screenStore.remove('xdebug_inspector');
});

window.ipcRenderer.on('screen-window:closed', (event, args) => {
    screenStore.toggleVisible(args.screen);

    setTimeout(() => {
        emit('toggleScreen', screen === 'home' ? screenStore.getNext('home').screen_name : 'home');
    }, 200);
});

const screenCounts = computed(() => {
    const stores: Record<string, any> = {
        jobs: { ...jobStore.jobs, ...jobStore.incoming },
        mail: mailStore.mails,
        logs: { ...logStore.logs, ...logStore.incoming },
        tail_logs: tailLogStore.entries,
        queries: queriesStore.payload,
        brain: brainStore.brains,
        profiler: profileStore.profiles
    };

    const term = globalSearchStore.search.toLowerCase().trim();
    const result: Record<string, string> = {};

    for (const screen of screenStore.allVisible()) {
        const name = screen.screen_name;
        const items = stores[name] || payloadStore.get(name);
        let list: any[] = [];

        if (Array.isArray(items)) {
            list = items;
        } else if (items && typeof items === 'object') {
            list = Object.values(items);
        }

        if (list.length === 0) {
            result[name] = '';
            continue;
        }

        if (!term) {
            result[name] = `${list.length}`;
            continue;
        }

        const count = list.filter((item) => matchesScreenSearch(name, item, term)).length;
        result[name] = count > 0 ? `${count}` : '';
    }

    return result;
});

const splitScreenName = computed(() =>
    splitPanesStore.splitConfig?.active ? splitPanesStore.splitConfig.screenName : null
);

const isScreenInSplit = (screenName: string) => {
    return splitScreenName.value === screenName;
};

const formattedScreenName = (name: string) => {
    return name
        .split(/[\s_]+/) // Split by spaces or underscores
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
};
</script>

<template>
    <div
        class="flex min-w-0"
        :class="[isVertical ? 'flex-col h-full w-full' : 'items-stretch self-stretch', attrs.class]"
        @wheel="onWheelScroll"
    >
        <div
            ref="tablistRef"
            role="tablist"
            class="flex no-scrollbar flex-nowrap flex-1 min-w-0"
            :class="
                isVertical ? 'flex-col items-stretch overflow-y-auto w-full gap-0.5' : 'items-stretch overflow-x-auto'
            "
        >
            <template
                v-for="(screen, index) in screenStore.allVisible()"
                :key="screen.screen_name"
            >
                <button
                    v-show="!isScreenInSplit(screen.screen_name)"
                    type="button"
                    role="tab"
                    :aria-selected="screen.screen_name === screenStore.screen"
                    :tabindex="screen.screen_name === screenStore.screen ? 0 : -1"
                    draggable="true"
                    class="ld-tab group flex items-center gap-1.5 shrink-0 px-2 whitespace-nowrap select-none cursor-default! text-[0.8rem] transition-colors"
                    :class="{
                        'is-active text-base-content font-medium': screen.screen_name === screenStore.screen,
                        'text-base-content/60 hover:text-base-content': screen.screen_name !== screenStore.screen,
                        'is-vertical h-8 w-full justify-between rounded-md hover:bg-base-content/5': isVertical,
                        dragging: isDraggingIndex === index
                    }"
                    @click="$emit('toggleScreen', screen.screen_name, true)"
                    @contextmenu="onTabContextMenu($event, screen.screen_name)"
                    @dragstart="onDragStart(index, $event, screen)"
                    @dragover.prevent
                    @dragend="onDragEnd($event, screen)"
                >
                    <span class="inline-flex items-center gap-2 min-w-0">
                        <component
                            :is="screenIcon(screen.screen_name)"
                            v-if="showIcons"
                            class="w-4 h-4 shrink-0"
                        />
                        <span class="leading-none whitespace-nowrap">
                            {{ formattedScreenName(screen.screen_name) }}
                        </span>
                    </span>

                    <span class="inline-flex items-center gap-1 shrink-0">
                        <span
                            v-if="screenCounts[screen.screen_name]"
                            class="font-mono text-[0.7rem] font-normal text-base-content/50 leading-none"
                        >
                            {{ screenCounts[screen.screen_name] }}
                        </span>

                        <button
                            v-if="isEnvironmentScreen(screen.screen_name)"
                            @click.stop="removeEnvironmentScreen(screen.screen_name)"
                            class="ld-tab-x grid place-items-center size-4 rounded text-base-content/50 hover:text-error hover:bg-error/10 cursor-pointer"
                            :aria-label="`Close ${formattedScreenName(screen.screen_name)}`"
                            title="Close view · turns the observer off"
                        >
                            <XMarkIcon class="size-3" />
                        </button>

                        <button
                            v-if="screen.screen_name === 'tail_logs'"
                            @click.stop="disableTailLog"
                            class="ld-tab-x grid place-items-center size-4 rounded text-base-content/50 hover:text-error hover:bg-error/10 cursor-pointer"
                            title="Disable tail log"
                        >
                            <XMarkIcon class="size-3" />
                        </button>
                    </span>
                </button>
            </template>

            <div
                v-if="availableEnvironments.length > 0"
                class="flex items-center shrink-0"
                :class="isVertical ? 'w-full pt-1' : 'sticky right-0 pl-1 bg-base-200'"
            >
                <button
                    type="button"
                    @click="toggleEnvironmentDropdown"
                    class="grid place-items-center size-7 rounded-md cursor-pointer transition-colors hover:bg-base-content/10 hover:text-base-content"
                    :class="showEnvironmentDropdown ? 'text-primary bg-base-content/10' : 'text-base-content/60'"
                    aria-label="Add view"
                    title="Add view · turns its observer on"
                    data-add-env-button
                >
                    <PlusIcon class="size-4" />
                </button>
            </div>
        </div>
    </div>

    <Teleport to="#context-menu-portal">
        <EnvironmentDropdown
            :environments="availableEnvironments"
            :visible="showEnvironmentDropdown"
            :show-icons="showIcons"
            @environment-selected="onEnvironmentSelected"
            @close="showEnvironmentDropdown = false"
        />
    </Teleport>

    <Teleport to="#context-menu-portal">
        <div
            v-if="contextMenu.visible"
            class="screen-context-menu fixed z-99999 bg-base-200 shadow-lg border border-base-content/10 rounded-xl p-1 min-w-[160px]"
            :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
        >
            <ul class="menu menu-compact p-0 text-xs">
                <li>
                    <a
                        @click="onOpenScreenWindow"
                        class="flex items-center gap-2 px-3 py-2 rounded-lg"
                    >
                        Open in new window
                    </a>
                </li>
            </ul>
        </div>
    </Teleport>
</template>

<style scoped>
@reference "./../../styles.css";

.ld-tab:not(.is-vertical).is-active {
    box-shadow: inset 0 -2px 0 var(--color-primary);
}

.ld-tab.is-vertical.is-active {
    box-shadow: inset 2px 0 0 var(--color-primary);
    @apply bg-base-content/5;
}

.ld-tab .ld-tab-x {
    opacity: 0;
}

.ld-tab.is-active .ld-tab-x,
.ld-tab:hover .ld-tab-x,
.ld-tab:focus-within .ld-tab-x {
    opacity: 1;
}

[draggable='true'] {
    cursor: grab;
}

[draggable='true']:active {
    cursor: grabbing;
}

.dragging {
    @apply opacity-50 border-dashed border border-primary;
}

.no-scrollbar::-webkit-scrollbar {
    display: none;
}

.no-scrollbar {
    -ms-overflow-style: none; /* IE and Edge */
    scrollbar-width: none; /* Firefox */
}
</style>
