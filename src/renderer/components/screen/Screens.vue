<script setup lang="ts">
import { defineEmits, ref, computed } from 'vue';
import { useScreenStore } from '@/store/screen';
import { usePayloadStore } from '@/store/payload';
import { useJobStore } from '@/store/jobs';
import { useMailStore } from '@/store/mail';
import { useLogStore } from '@/store/logs.js';
import { useQueriesPayloadStore } from '@/store/queries.js';
import { useSplitPanesStore } from '@/store/split-panes';
import { useBrainStore } from '@/store/brains.ts';
import EnvironmentDropdown from './EnvironmentDropdown.vue';
import type { Environment } from '../../../main/storage';

const props = defineProps<{
    environments?: Environment[];
}>();

const emit = defineEmits(['toggleScreen', 'dragScreen', 'environmentSelected', 'removeEnvironmentScreen']);

const screenStore = useScreenStore();
const payloadStore = usePayloadStore();
const jobStore = useJobStore();
const mailStore = useMailStore();
const logStore = useLogStore();
const brainStore = useBrainStore();
const queriesStore = useQueriesPayloadStore();
const splitPanesStore = useSplitPanesStore();

const showTooltip = ref(false);
const isDraggingIndex = ref(null);
const showEnvironmentDropdown = ref(false);

const availableEnvironments = computed(() => {
    if (!props.environments) return [];

    const ignoredEnvironment = (value: string): boolean =>
        ['dump', 'enabled_in_testing', 'original_dump', 'auto_invoke_app'].includes(value);

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

const isEnvironmentScreen = (screenName) => {
    return props.environments?.some((env) => env.value === screenName) || false;
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

const isScreenInSplit = (screenName: string) => {
    return splitPanesStore.splitConfig?.active && splitPanesStore.splitConfig.screenName === screenName;
};
</script>

<template>
    <div class="flex items-center relative">
        <div
            role="tablist"
            class="tabs tabs-border flex items-center"
        >
            <div
                v-for="(screen, index) in screenStore.allVisible()"
                :key="screen.screen_name"
                v-show="!isScreenInSplit(screen.screen_name)"
                role="tab"
                class="select-none tabs-xs gap-1 flex items-center py-1"
                :class="{ dragging: isDraggingIndex === index }"
                v-bind:draggable="true"
                @dragstart="onDragStart(index, $event, screen)"
                @dragover.prevent
                @dragend="onDragEnd($event, screen)"
            >
                <div
                    class="tab"
                    :class="{
                        'ml-1': index > 0,
                        'tab-active font-semibold':
                            screen.screen_name === screenStore.screen && screenStore.screens.length > 1
                    }"
                >
                    <span class="flex font-normal items-center capitalize gap-1">
                        <span
                            @click="$emit('toggleScreen', screen.screen_name, true)"
                            class="text-[0.85rem] cursor-pointer"
                        >
                            {{ screen.screen_name }}
                        </span>

                        <span
                            v-if="getPayloadScreenCount(screen.screen_name).length > 0"
                            class="text-[0.7rem] text-base-content/70 badge !bg-transparent !border-0 p-0.5 h-[14px]"
                            >{{ getPayloadScreenCount(screen.screen_name) }}</span
                        >

                        <button
                            v-if="isEnvironmentScreen(screen.screen_name)"
                            @click.stop="removeEnvironmentScreen(screen.screen_name)"
                            class="ml-1 text-base-content/50 hover:text-error text-xs"
                            title="Remove screen"
                        >
                            ✕
                        </button>
                    </span>
                </div>
            </div>

            <div class="relative flex items-center">
                <button
                    @click="toggleEnvironmentDropdown"
                    class="tab ml-1 px-3 text-base-content/70 hover:text-base-content flex items-center justify-center"
                    :class="{ 'text-primary': showEnvironmentDropdown }"
                    title="Add environment screen"
                    data-add-env-button
                >
                    <span class="text-lg leading-none">+</span>
                </button>

                <EnvironmentDropdown
                    :environments="availableEnvironments"
                    :visible="showEnvironmentDropdown"
                    @environment-selected="onEnvironmentSelected"
                    @close="showEnvironmentDropdown = false"
                />
            </div>
        </div>
    </div>
</template>

<style scoped>
@reference "./../../styles.css";

.tab {
    @apply px-3;
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
</style>
