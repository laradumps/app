<template>
    <div class="flex mb-2">
        <div
            class="select-none gap-1 flex py-1"
            v-for="(screen, index) in screenStore.allVisible()"
            :key="screen.screen_name"
            :class="{ dragging: isDraggingIndex === index }"
            draggable="true"
            @dragstart="onDragStart(index)"
            @dragover.prevent
            @drop="onDrop(index)"
            @dragend="onDragEnd($event, screen)"
            title="drag and drop to open in new window"
        >
            <div
                class="tabs"
                @click="$emit('toggleScreen', screen.screen_name)"
                :class="{
                    'ml-1': index > 0,
                    'tabs-bordered': screen.screen_name === screenStore.screen && screenStore.screens.length > 1
                }"
            >
                <input
                    type="radio"
                    class="tab uppercase font-normal tracking-wider text-[0.65rem]"
                    :aria-label="screen.screen_name"
                />
            </div>
        </div>

        <div
            v-if="showTooltip"
            class="flex gap-2 border border-neutral/30 bg-neutral-content text-neutral py-1 px-1.5 rounded text-xs fixed right-2 top-2"
        >
            <IconExternalLink class="size-4" />
            <span>Drag and drop to open in new window</span>
        </div>
    </div>
</template>

<script setup>
import { defineProps, defineEmits, ref } from "vue";
import { useScreenStore } from "@/store/screen";
import { usePayloadStore } from "@/store/payload";
import IconExternalLink from "@/components/Icons/IconExternalLink.vue";

const emit = defineEmits(["toggleScreen"]);

const screenStore = useScreenStore();
const payloadStore = usePayloadStore();

const props = defineProps({
    payload: {
        type: Array,
        default: null
    }
});

const showTooltip = ref(false);
const isDraggingIndex = ref(null);

const onDragStart = (index) => {
    isDraggingIndex.value = index;
    showTooltip.value = true;
};

const onDrop = (index) => {
    if (isDraggingIndex.value !== null) {
        const draggedScreen = props.screens[isDraggingIndex.value];
        props.screens.splice(isDraggingIndex.value, 1);
        props.screens.splice(index, 0, draggedScreen);
        isDraggingIndex.value = null;
    }
};

const onDragEnd = (event, screen) => {
    isDraggingIndex.value = null;
    showTooltip.value = false;

    const mouseX = event.screenX;
    const mouseY = event.screenY;

    openScreenWindow(screen.screen_name, mouseX, mouseY);
};

const openScreenWindow = (screen, mouseX, mouseY) => {
    screenStore.toggleVisible(screen);

    const serializablePayload = JSON.parse(JSON.stringify(payloadStore.get(screen)));

    window.ipcRenderer.send("screen-window:show", {
        screen: screen,
        payload: serializablePayload,
        position: {
            x: mouseX,
            y: mouseY
        }
    });

    setTimeout(() => {
        let screen1;
        if (screen === "screen 1") {
            screen1 = screenStore.getNext("screen 1");
            emit("toggleScreen", screen1.screen_name);
        } else {
            emit("toggleScreen", "screen 1");
        }
    }, 200);
};

window.ipcRenderer.on("screen-window:closed", (event, args) => {
    setTimeout(() => {
        let screen1;
        if (args.screen === "screen 1") {
            screen1 = screenStore.getNext("screen 1");
            emit("toggleScreen", screen1.screen_name);
        } else {
            emit("toggleScreen", "screen 1");
        }

        screenStore.toggleVisible(args.screen);
    }, 200);
});
</script>

<style scoped>
.tab {
    @apply px-3;
}

[draggable="true"] {
    cursor: grab;
}

[draggable="true"]:active {
    cursor: grabbing;
}

.dragging {
    @apply border-dashed border border-primary;
}
</style>
