<template>
    <div class="split-root" ref="root">
        <div class="pane pane-a" :style="paneAStyle">
            <slot name="pane-a"></slot>
        </div>

        <div
            class="divider"
            @mousedown="startDrag"
            title="Drag to resize"
        ></div>

        <div class="pane pane-b" :style="paneBStyle">
            <slot name="pane-b"></slot>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onUnmounted } from "vue";

const props = defineProps({
    orientation: { type: String, default: "vertical" }
});

const emit = defineEmits(["close"]);

const root = ref(null);
const sizePercent = ref(50);
let dragging = false;

const paneAStyle = computed(() => {
    return {
        width: `${sizePercent.value}%`,
        minWidth: '10%',
        maxWidth: '90%'
    };
});

const paneBStyle = computed(() => {
    return {
        width: `${100 - sizePercent.value}%`,
        minWidth: '10%',
        maxWidth: '90%'
    };
});

const onMouseMove = (e) => {
    if (!dragging || !root.value) return;

    const rect = root.value.getBoundingClientRect();
    const x = e.clientX - rect.left;
    let pct = (x / rect.width) * 100;

    pct = Math.max(10, Math.min(90, pct));

    sizePercent.value = pct;
};

const onMouseUp = () => {
    dragging = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
};

const startDrag = (e) => {
    e.preventDefault();
    dragging = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
};

onUnmounted(() => {
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
});
</script>

<style scoped>
@reference "./../../styles.css";
</style>
