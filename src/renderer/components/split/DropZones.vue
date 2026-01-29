<script setup>
import { ref } from 'vue';

const props = defineProps({
    isDragging: Boolean
});

const emit = defineEmits(['drop']);

const activeZone = ref(null);

const handleDragEnter = (zone) => {
    activeZone.value = zone;
};

const handleDragLeave = (e) => {
    if (e.target.classList.contains('drop-zone')) {
        activeZone.value = null;
    }
};

const handleDrop = (zone) => {
    emit('drop', zone);
    activeZone.value = null;
};
</script>
<template>
    <div
        v-if="isDragging"
        class="drop-zones-overlay"
    >
        <div
            class="drop-zone drop-zone-right"
            :class="{ 'drop-zone-active': activeZone === 'right' }"
            @dragenter.prevent="handleDragEnter('right')"
            @dragleave.prevent="handleDragLeave"
            @dragover.prevent
            @drop.prevent="handleDrop('right')"
        >
            <span class="drop-zone-indicator"> Drop to split right </span>
        </div>

        <div
            v-if="activeZone"
            class="split-preview"
        >
            <div class="preview-pane preview-main"></div>
            <div class="preview-pane preview-new"></div>
        </div>
    </div>
</template>
<style scoped>
@reference "./../../styles.css";

.drop-zones-overlay {
    @apply fixed left-0 right-0 bottom-0 pointer-events-none z-[9998];
    top: 44px;
}

.drop-zone {
    @apply absolute pointer-events-auto flex items-center justify-center transition-all duration-150 ease-in-out bg-transparent;
}

.drop-zone-right {
    @apply top-0 right-0 bottom-0;
    width: 45%;
}

.drop-zone-indicator {
    @apply opacity-0 transition-opacity duration-200 ease-in-out pointer-events-none;
    color: rgba(59, 130, 246, 0.4);
}

.drop-zone:hover .drop-zone-indicator,
.drop-zone-active .drop-zone-indicator {
    @apply opacity-100;
}

.drop-zone-active .drop-zone-indicator {
    @apply text-base-content/60;
}

.split-preview {
    @apply fixed left-0 right-1 bottom-1 rounded-md pointer-events-none z-[9997] flex flex-row gap-1 p-1;
    top: 44px;
}

.preview-pane {
    @apply border-2 border-base-content/30 rounded-lg transition-all duration-200 ease-in-out;
}

.preview-main {
    @apply flex-1 opacity-0;
}

.preview-new {
    @apply flex-1 bg-base-content/10 animate-pulse;
}
</style>
