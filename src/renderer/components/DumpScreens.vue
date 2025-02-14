<script setup>
import { computed, defineEmits, ref } from "vue";
import { useScreenStore } from "@/store/screen";
import { usePayloadStore } from "@/store/payload";
import IconExternalLink from "@/components/Icons/IconExternalLink.vue";
import { XMarkIcon } from "@heroicons/vue/24/solid";

const emit = defineEmits(["toggleScreen"]);

const screenStore = useScreenStore();
const payloadStore = usePayloadStore();

const showTooltip = ref(false);
const isDraggingIndex = ref(null);

const onDragStart = (index) => {
    isDraggingIndex.value = index;
    showTooltip.value = true;
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
        const screenName = screen === "home" ? screenStore.getNext("home").screen_name : "home";
        emit("toggleScreen", screenName, true);
    }, 200);
};

window.ipcRenderer.on("screen-window:xdebug-closed", (event, args) => {
    screenStore.remove("xdebug_inspector");
});

window.ipcRenderer.on("screen-window:closed", (event, args) => {
    screenStore.toggleVisible(args.screen);

    setTimeout(() => {
        emit("toggleScreen", screen === "home" ? screenStore.getNext("home").screen_name : "home");
    }, 200);
});

const getPayloadScreenCount = (screenName) => {
    return payloadStore.get(screenName).length;
};
</script>
<template>
    <div class="flex mb-1">
        <div
            class="select-none gap-1 flex py-1"
            v-for="(screen, index) in screenStore.allVisible()"
            :key="screen.screen_name"
            :class="{ dragging: isDraggingIndex === index }"
            v-bind:draggable="!['home', 'livewire'].includes(screen.screen_name)"
            @dragstart="onDragStart(index)"
            @dragover.prevent
            @dragend="onDragEnd($event, screen)"
            title="drag and drop to open in new window"
        >
            <div
                class="tabs"
                @click="$emit('toggleScreen', screen.screen_name, true)"
                :class="{
                    'ml-1': index > 0,
                    'tabs-bordered': screen.screen_name === screenStore.screen && screenStore.screens.length > 1
                }"
            >
                <span class="tab uppercase text-[0.70rem] flex gap-1">
                    {{ screen.screen_name }}
                    <span
                        v-if="getPayloadScreenCount(screen.screen_name) > 0"
                        class="text-[11px] badge badge-ghost p-0.5 h-[14px]"
                        >({{ getPayloadScreenCount(screen.screen_name) }})</span
                    >
                </span>
            </div>
        </div>

        <div
            v-if="showTooltip"
            class="flex gap-2 border border-neutral/30 bg-neutral text-neutral-content py-1 px-1.5 rounded text-xs fixed right-2 top-2"
        >
            <IconExternalLink class="size-4" />
            <span>Drag and drop to open in new window</span>
        </div>
    </div>
</template>

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
