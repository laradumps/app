<script setup lang="ts">
import { defineEmits, ref, computed, onMounted, onUnmounted } from 'vue';
import { useScreenStore } from '@/store/screen';
import { usePayloadStore } from '@/store/payload';
import { useJobStore } from '@/store/jobs';
import { useMailStore } from '@/store/mail';
import { useLogStore } from '@/store/logs.js';
import { useTailLogStore } from '@/store/tail-log';
import { useQueriesPayloadStore } from '@/store/queries.js';
import { useSplitPanesStore } from '@/store/split-panes';
import { useBrainStore } from '@/store/brains.ts';
import EnvironmentDropdown from './EnvironmentDropdown.vue';
import type { Environment } from '../../../main/storage';
import { XMarkIcon } from '@heroicons/vue/20/solid';
import { isSpecialEnvironment } from '@/constants';

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
const splitPanesStore = useSplitPanesStore();

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

onMounted(() => document.addEventListener('click', handleClickOutside));
onUnmounted(() => document.removeEventListener('click', handleClickOutside));

const onWheelScroll = (e: WheelEvent) => {
    if (!tablistRef.value) return;
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

const getPayloadScreenCount = (screenName) => {
    const stores = {
        jobs: jobStore.jobs,
        mail: mailStore.mails,
        logs: logStore.logs,
        tail_logs: tailLogStore.entries,
        queries: queriesStore.payload,
        brain: brainStore.brains
    };

    const items = stores[screenName] || payloadStore.get(screenName);

    let count = 0;

    if (Array.isArray(items)) {
        count = items.length;
    } else if (items && typeof items === 'object') {
        count = Object.keys(items).length;
    }

    return count > 0 ? `(${count})` : '';
};

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
        class="flex items-center w-full min-w-0"
        @wheel.prevent="onWheelScroll"
    >
        <div
            ref="tablistRef"
            role="tablist"
            class="tabs tabs-box flex items-center overflow-x-auto no-scrollbar flex-nowrap flex-1 min-w-0"
        >
            <template
                v-for="(screen, index) in screenStore.allVisible()"
                :key="screen.screen_name"
            >
                <a
                    v-show="!isScreenInSplit(screen.screen_name)"
                    role="tab"
                    draggable="true"
                    class="tab cursor-default! flex! flex-row! items-center! gap-2 select-none transition-all duration-200 whitespace-nowrap! group h-full"
                    :class="{
                        'tab-active font-semibold': screen.screen_name === screenStore.screen,
                        dragging: isDraggingIndex === index
                    }"
                    @click="$emit('toggleScreen', screen.screen_name, true)"
                    @contextmenu="onTabContextMenu($event, screen.screen_name)"
                    @dragstart="onDragStart(index, $event, screen)"
                    @dragover.prevent
                    @dragend="onDragEnd($event, screen)"
                >
                    <span class="text-[0.85rem] leading-none whitespace-nowrap">
                        {{ formattedScreenName(screen.screen_name) }}
                    </span>

                    <span class="inline-flex items-center gap-1 shrink-0">
                        <span
                            v-if="getPayloadScreenCount(screen.screen_name).length > 0"
                            class="text-[0.7rem] text-base-content/70 leading-none"
                        >
                            {{ getPayloadScreenCount(screen.screen_name) }}
                        </span>

                        <button
                            v-if="isEnvironmentScreen(screen.screen_name)"
                            @click.stop="removeEnvironmentScreen(screen.screen_name)"
                            class="text-base-content/40 hover:text-error text-[10px] w-4 h-4 rounded-full hover:bg-error/10 transition-all flex items-center justify-center shrink-0"
                            title="Remove screen"
                        >
                            <XMarkIcon />
                        </button>
                    </span>
                </a>
            </template>

            <div
                v-if="availableEnvironments.length > 0"
                class="sticky -right-2 flex items-center shrink-0 bg-base-200"
            >
                <button
                    @click="toggleEnvironmentDropdown"
                    class="tab px-3 text-base-content/70 hover:text-base-content flex items-center justify-center transition-all duration-200"
                    :class="{ 'text-primary bg-base-200/50': showEnvironmentDropdown }"
                    title="Add environment screen"
                    data-add-env-button
                >
                    <span class="text-xl leading-none">+</span>
                </button>
            </div>
        </div>
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
            class="screen-context-menu fixed z-99999 bg-base-200 shadow-[0_10px_40px_rgba(0,0,0,0.5)] border border-white/5 rounded-xl p-1 min-w-[160px]"
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

.tab {
    @apply px-4 flex! flex-row! flex-nowrap! items-center! justify-center! gap-2! whitespace-nowrap! h-8 min-h-8;
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
