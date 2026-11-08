<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted, useAttrs, watch } from 'vue';

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
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, XMarkIcon } from '@heroicons/vue/20/solid';
import { screenIcon } from './screen-icons';
import { isSpecialEnvironment } from '@/constants';
import { matchesScreenSearch } from '@/utils/searchMatchers';

const props = defineProps<{
    environments?: Environment[];
    inNavbar?: boolean;
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

watch(
    () => screenStore.screen,
    () =>
        nextTick(() =>
            tablistRef.value
                ?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')
                ?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
        )
);

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
    return props.environments
        .filter((env) => !env.selected && !ignoredEnvironment(env.value) && !screenStore.get(env.value))
        .sort((a, b) => a.value.localeCompare(b.value));
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

const isClosable = (screenName) => screenName === 'tail_logs' || isEnvironmentScreen(screenName);
const closeTab = (screenName) => (screenName === 'tail_logs' ? disableTailLog() : removeEnvironmentScreen(screenName));
const closeTitle = (screenName) =>
    screenName === 'tail_logs' ? 'Disable tail log' : 'Close view · turns the observer off';

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

const screenLists = computed(() => {
    const stores: Record<string, any> = {
        jobs: { ...jobStore.jobs, ...jobStore.incoming },
        mail: mailStore.mails,
        logs: { ...logStore.logs, ...logStore.incoming },
        tail_logs: tailLogStore.entries,
        queries: queriesStore.payload,
        brain: brainStore.brains,
        profiler: profileStore.profiles
    };

    const result: Record<string, any[]> = {};

    for (const screen of screenStore.allVisible()) {
        const items = stores[screen.screen_name] || payloadStore.get(screen.screen_name);
        result[screen.screen_name] = Array.isArray(items)
            ? items
            : items && typeof items === 'object'
              ? Object.values(items)
              : [];
    }

    return result;
});

const screenCounts = computed(() => {
    const term = globalSearchStore.search.toLowerCase().trim();
    const result: Record<string, string> = {};

    for (const [name, list] of Object.entries(screenLists.value)) {
        const count = term ? list.filter((item) => matchesScreenSearch(name, item, term)).length : list.length;
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

const seenCounts = ref<Record<string, number>>({});

const screenSizes = computed(() =>
    Object.fromEntries(Object.entries(screenLists.value).map(([name, list]) => [name, list.length]))
);

watch(
    [screenSizes, () => screenStore.screen, splitScreenName],
    () => {
        for (const [name, size] of Object.entries(screenSizes.value)) {
            const seen = seenCounts.value[name];
            const onScreen = name === screenStore.screen || name === splitScreenName.value;

            if (seen === undefined || onScreen || size < seen) {
                seenCounts.value[name] = size;
            }
        }
    },
    { immediate: true }
);

const hasUnseen = (name: string) => (screenSizes.value[name] ?? 0) > (seenCounts.value[name] ?? 0);

const hiddenUnseen = ref<{ left: string | null; right: string | null }>({ left: null, right: null });

const updateHiddenUnseen = () => {
    const list = tablistRef.value;
    const hidden: { left: string | null; right: string | null } = { left: null, right: null };

    if (list && !isVertical.value) {
        const box = list.getBoundingClientRect();

        for (const tab of list.querySelectorAll<HTMLElement>('[data-screen]')) {
            const name = tab.dataset.screen!;
            if (!hasUnseen(name)) continue;

            const rect = tab.getBoundingClientRect();
            const middle = rect.left + rect.width / 2;

            if (middle < box.left) hidden.left = name;
            else if (middle > box.right - 12 && !hidden.right) hidden.right = name;
        }
    }

    hiddenUnseen.value = hidden;
};

const tablistMask = computed(() => {
    const left = hiddenUnseen.value.left ? 'transparent 22px, #000 34px' : '#000 0px';
    const right = hiddenUnseen.value.right
        ? '#000 calc(100% - 34px), transparent calc(100% - 22px)'
        : '#000 calc(100% - 12px), transparent';

    return `linear-gradient(to right, ${left}, ${right})`;
});

const revealTab = (name: string | null) =>
    name &&
    tablistRef.value
        ?.querySelector<HTMLElement>(`[data-screen="${CSS.escape(name)}"]`)
        ?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });

watch(
    [
        () => Object.keys(screenSizes.value).filter(hasUnseen).join(),
        () =>
            screenStore
                .allVisible()
                .map((screen) => screen.screen_name)
                .join(),
        isVertical
    ],
    () => nextTick(updateHiddenUnseen)
);

onMounted(() => window.addEventListener('resize', updateHiddenUnseen));
onUnmounted(() => window.removeEventListener('resize', updateHiddenUnseen));
</script>

<template>
    <div
        class="flex min-w-0"
        :class="[isVertical ? 'flex-col h-full w-full' : 'items-stretch self-stretch', attrs.class]"
        @wheel="onWheelScroll"
    >
        <div
            class="relative flex min-w-0 min-h-0"
            :class="{ 'flex-col w-full': isVertical }"
        >
            <div
                ref="tablistRef"
                role="tablist"
                class="flex no-scrollbar flex-nowrap min-w-0"
                :class="
                    isVertical
                        ? 'flex-col items-stretch overflow-y-auto w-full min-h-0 gap-0.5'
                        : 'items-stretch overflow-x-auto ld-tablist-fade'
                "
                :style="isVertical ? undefined : { maskImage: tablistMask }"
                @scroll.passive="updateHiddenUnseen"
            >
                <template
                    v-for="(screen, index) in screenStore.allVisible()"
                    :key="screen.screen_name"
                >
                    <button
                        v-show="!isScreenInSplit(screen.screen_name)"
                        type="button"
                        role="tab"
                        :data-screen="screen.screen_name"
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
                        <span class="inline-flex items-center gap-1.5 min-w-0">
                            <span
                                v-if="showIcons"
                                class="relative grid size-4 shrink-0 place-items-center"
                            >
                                <component
                                    :is="screenIcon(screen.screen_name)"
                                    class="size-4"
                                    :class="{ 'ld-tab-icon': isClosable(screen.screen_name) }"
                                />
                                <span
                                    v-if="hasUnseen(screen.screen_name)"
                                    class="absolute -top-0.5 -right-1 size-1.5 rounded-full bg-primary"
                                />
                                <button
                                    v-if="isClosable(screen.screen_name)"
                                    @click.stop="closeTab(screen.screen_name)"
                                    class="ld-tab-x absolute inset-0 grid place-items-center rounded text-base-content/60 hover:text-error hover:bg-error/10 cursor-pointer"
                                    :aria-label="`Close ${formattedScreenName(screen.screen_name)}`"
                                    :title="closeTitle(screen.screen_name)"
                                >
                                    <XMarkIcon class="size-3.5" />
                                </button>
                            </span>
                            <span
                                v-if="!showIcons && hasUnseen(screen.screen_name)"
                                class="size-1.5 shrink-0 rounded-full bg-primary"
                            />
                            <span class="leading-none whitespace-nowrap">
                                {{ formattedScreenName(screen.screen_name) }}
                            </span>
                            <span
                                v-if="hasUnseen(screen.screen_name)"
                                class="sr-only"
                                >, new items</span
                            >
                        </span>

                        <span class="inline-flex items-center gap-1.5 shrink-0">
                            <span
                                v-if="screenCounts[screen.screen_name]"
                                class="font-mono text-[0.7rem] font-normal tabular-nums leading-none"
                                :class="hasUnseen(screen.screen_name) ? 'text-primary' : 'text-base-content/50'"
                            >
                                {{ screenCounts[screen.screen_name] }}
                            </span>

                            <button
                                v-if="!showIcons && isClosable(screen.screen_name)"
                                @click.stop="closeTab(screen.screen_name)"
                                class="ld-tab-x grid place-items-center size-4 rounded text-base-content/50 hover:text-error hover:bg-error/10 cursor-pointer"
                                :aria-label="`Close ${formattedScreenName(screen.screen_name)}`"
                                :title="closeTitle(screen.screen_name)"
                            >
                                <XMarkIcon class="size-3" />
                            </button>
                        </span>
                    </button>
                </template>
            </div>

            <button
                v-for="side in ['left', 'right'] as const"
                v-show="hiddenUnseen[side]"
                :key="side"
                type="button"
                class="absolute inset-y-0 grid w-6 place-items-center text-base-content/60 hover:text-base-content cursor-pointer"
                :class="side === 'left' ? 'left-0' : 'right-0'"
                :title="`${formattedScreenName(hiddenUnseen[side] ?? '')} has new items`"
                :aria-label="`Show ${formattedScreenName(hiddenUnseen[side] ?? '')}, new items`"
                @click="revealTab(hiddenUnseen[side])"
            >
                <span class="relative">
                    <component
                        :is="side === 'left' ? ChevronLeftIcon : ChevronRightIcon"
                        class="size-4"
                    />
                    <span class="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-primary" />
                </span>
            </button>
        </div>

        <Teleport
            defer
            to="#navbar-actions"
            :disabled="!inNavbar"
        >
            <div
                v-if="availableEnvironments.length > 0"
                class="flex items-center shrink-0"
                :class="{ 'w-full pt-1': isVertical }"
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
        </Teleport>
    </div>

    <Teleport to="#context-menu-portal">
        <EnvironmentDropdown
            :environments="availableEnvironments"
            :visible="showEnvironmentDropdown"
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
    pointer-events: none;
}

.ld-tablist-fade {
    padding-right: 12px;
}

.ld-tab.is-active:is(:hover, :focus-visible, :has(:focus-visible)) .ld-tab-x {
    opacity: 1;
    pointer-events: auto;
    transition: pointer-events 0s 350ms allow-discrete;
}

.ld-tab.is-active:is(:hover, :focus-visible, :has(:focus-visible)) .ld-tab-icon {
    opacity: 0;
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
