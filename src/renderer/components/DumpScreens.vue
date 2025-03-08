<script setup>
import { defineEmits, ref } from "vue";
import { useScreenStore } from "@/store/screen";
import { usePayloadStore } from "@/store/payload";
import IconExternalLink from "@/components/Icons/IconExternalLink.vue";
import { useJobStore } from "@/store/jobs";
import IconPin from "@/components/Icons/IconPin.vue";
import { useMailStore } from "@/store/mail";
import { useLogStore } from "@/store/logs.js";
import { useQueriesPayloadStore } from "@/store/queries.js";

const emit = defineEmits(["toggleScreen"]);

const screenStore = useScreenStore();
const payloadStore = usePayloadStore();
const jobStore = useJobStore();
const mailStore = useMailStore();
const logStore = useLogStore();
const queriesStore = useQueriesPayloadStore();

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
    const serializableJobPayload = JSON.parse(JSON.stringify(jobStore.jobs));
    const serializableMailPayload = JSON.parse(JSON.stringify(mailStore.mails));
    const serializableLogPayload = JSON.parse(JSON.stringify(logStore.logs));
    const serializableQueriesPayload = JSON.parse(JSON.stringify(queriesStore.payload));

    window.ipcRenderer.send("screen-window:show", {
        screen: screen,
        payload: serializablePayload,
        jobs: serializableJobPayload,
        mails: serializableMailPayload,
        logs: serializableLogPayload,
        queries: serializableQueriesPayload,
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
    if (screenName === "jobs") {
        return Object.entries(jobStore.jobs).length;
    }

    if (screenName === "mail") {
        return Object.entries(mailStore.mails).length;
    }

    if (screenName === "logs") {
        return Object.entries(logStore.logs).length;
    }

    if (screenName === "queries") {
        return Object.entries(queriesStore.payload).length;
    }

    return payloadStore.get(screenName).length;
};

const pinScreen = (screen) => {
    screenStore.pin(screen);
};
</script>
<template>
    <div class="flex mb-1">
        <div
            role="tablist"
            class="tabs tabs-border"
        >
            <div
                role="tab"
                class="select-none gap-1 flex py-1"
                v-for="(screen, index) in screenStore.allVisible()"
                :key="screen.screen_name"
                :class="{ dragging: isDraggingIndex === index }"
                v-bind:draggable="!['home', 'livewire', 'queries'].includes(screen.screen_name)"
                @dragstart="onDragStart(index)"
                @dragover.prevent
                @dragend="onDragEnd($event, screen)"
                title="drag and drop to open in new window"
            >
                <div
                    class="tab"
                    @click="$emit('toggleScreen', screen.screen_name, true)"
                    @dblclick="pinScreen(screen.screen_name)"
                    :class="{
                        'ml-1': index > 0,
                        'tab-active font-semibold': screen.screen_name === screenStore.screen && screenStore.screens.length > 1
                    }"
                >
                    <span class="flex font-normal items-center capitalize gap-1">
                        <span>{{ screen.screen_name }}</span>
                        <span class="text-[11px] text-base-content/70 badge !bg-transparent !border-0 p-0.5 h-[14px]">({{ getPayloadScreenCount(screen.screen_name) }})</span>
                        <IconPin
                            v-if="screen.pinned"
                            class="w-3 text-secondary"
                        />
                    </span>
                </div>
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
@reference "./../styles.css";

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
