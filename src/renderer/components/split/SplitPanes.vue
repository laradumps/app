<script setup>
import { ref, computed, onUnmounted } from 'vue';

const props = defineProps({
    orientation: { type: String, default: 'vertical' },
    initialSplit: { type: Number, default: 50 }
});

const emit = defineEmits(['resize']);

const splitRoot = ref(null);
const paneA = ref(null);
const paneB = ref(null);
const splitter = ref(null);
const splitPosition = ref(props.initialSplit);
const isDragging = ref(false);

const paneAStyle = computed(() => {
    if (props.orientation === 'horizontal') {
        return { height: `${splitPosition.value}%` };
    }

    return { width: `${splitPosition.value}%` };
});

const paneBStyle = computed(() => {
    if (props.orientation === 'horizontal') {
        return { height: `${100 - splitPosition.value}%` };
    }
    return { width: `${100 - splitPosition.value}%` };
});

const startDrag = (e) => {
    isDragging.value = true;
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', stopDrag);
    e.preventDefault();
};

const onDrag = (e) => {
    if (!isDragging.value || !splitRoot.value) return;

    const rect = splitRoot.value.getBoundingClientRect();
    let newPosition;

    if (props.orientation === 'horizontal') {
        const y = e.clientY - rect.top;
        newPosition = (y / rect.height) * 100;
    } else {
        const x = e.clientX - rect.left;
        newPosition = (x / rect.width) * 100;
    }

    newPosition = Math.max(10, Math.min(90, newPosition));
    splitPosition.value = newPosition;

    emit('resize', { splitPosition: newPosition });
};

const stopDrag = () => {
    isDragging.value = false;
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', stopDrag);
};

onUnmounted(() => {
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', stopDrag);
});
</script>

<template>
    <div
        ref="splitRoot"
        class="split-root"
        :class="{ horizontal: orientation === 'horizontal' }"
    >
        <div
            ref="paneA"
            class="pane pane-a"
            :style="paneAStyle"
        >
            <slot name="pane-a"></slot>
        </div>
        <div
            ref="splitter"
            class="divider"
            @mousedown="startDrag"
        ></div>
        <div
            ref="paneB"
            class="pane pane-b"
            :style="paneBStyle"
        >
            <slot name="pane-b"></slot>
        </div>
    </div>
</template>

<style scoped>
@reference "./../../styles.css";

.split-root {
    @apply w-full h-full relative flex;
}

.split-root.horizontal {
    @apply flex-col;
}

.pane {
    @apply overflow-hidden relative flex flex-col;
}

.pane-a {
    @apply h-full;
}

.pane-b {
    @apply flex-1 min-w-0;
}

.divider {
    @apply bg-base-100 z-40 shrink-0 w-1.5 cursor-col-resize flex items-center justify-center border-l border-r border-base-100 transition-colors duration-200 select-none h-full;
    margin: var(--divider-m, 0rem 0);
}

.divider:hover {
    @apply bg-blue-500/15;
}

.divider:active {
    @apply bg-blue-500/25;
}

.divider::after {
    content: '';
    @apply w-0.5 h-[50px] bg-black/15 rounded-[3px] pointer-events-none;
}

.divider:hover::after {
    @apply bg-blue-500/40;
}
</style>
