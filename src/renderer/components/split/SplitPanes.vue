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
.split-root {
    display: flex;
    flex-direction: row;
    width: 100%;
    height: 100%;
    position: relative;
}

.pane {
    overflow: hidden;
    position: relative;
    display: flex;
    flex-direction: column;
}

.pane-a {
    border-right: 1px solid rgba(0,0,0,0.05);
    flex-shrink: 0;
}

.pane-b {
    flex: 1;
    min-width: 0;
}

.divider {
    background: rgba(0,0,0,0.02);
    z-index: 40;
    flex-shrink: 0;
    width: 6px;
    cursor: col-resize;
    display: flex;
    align-items: center;
    justify-content: center;
    border-left: 1px solid rgba(0,0,0,0.05);
    border-right: 1px solid rgba(0,0,0,0.05);
    transition: background 0.2s ease;
    user-select: none;
    height: 100%;
    margin: var(--divider-m, 0rem 0);
}

.divider:hover {
    background: rgba(59, 130, 246, 0.15);
}

.divider:active {
    background: rgba(59, 130, 246, 0.25);
}

.divider::after {
    content: "";
    width: 3px;
    height: 50px;
    background: rgba(0,0,0,0.15);
    border-radius: 3px;
    pointer-events: none;
}

.divider:hover::after {
    background: rgba(59, 130, 246, 0.4);
}
</style>
