
<script setup>
import { ref } from "vue";

const props = defineProps({
    isDragging: Boolean
});

const emit = defineEmits(["drop"]);

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
    emit("drop", zone);
    activeZone.value = null;
};
</script>
<template>
    <div v-if="isDragging" class="drop-zones-overlay">
        <div
            class="drop-zone drop-zone-right"
            :class="{ 'drop-zone-active': activeZone === 'right' }"
            @dragenter.prevent="handleDragEnter('right')"
            @dragleave.prevent="handleDragLeave"
            @dragover.prevent
            @drop.prevent="handleDrop('right')"
        >
            <div class="drop-zone-indicator">
                <svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                </svg>
            </div>
        </div>

        <div v-if="activeZone" class="split-preview">
            <div class="preview-pane preview-main"></div>
            <div class="preview-pane preview-new"></div>
        </div>
    </div>
</template>
<style scoped>
@reference "./../../styles.css";

.drop-zones-overlay {
    position: fixed;
    top: 44px;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    z-index: 9998;
}

.drop-zone {
    position: absolute;
    pointer-events: all;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
    background: transparent;
}

.drop-zone-right {
    top: 0;
    right: 0;
    width: 45%;
    bottom: 0;
}

.drop-zone-indicator {
    opacity: 0;
    transition: opacity 0.2s ease;
    pointer-events: none;
    color: rgba(59, 130, 246, 0.4);
}

.drop-zone:hover .drop-zone-indicator,
.drop-zone-active .drop-zone-indicator {
    opacity: 1;
}

.drop-zone-active .drop-zone-indicator {
    @apply text-base-content/60;
}

.split-preview {
    position: fixed;
    top: 44px;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    z-index: 9997;
    display: flex;
    flex-direction: row;
    gap: 4px;
    padding: 4px;
}

.preview-pane {
    @apply border-2 border-base-content/30;
    border-radius: 8px;
    transition: all 0.2s ease;
}

.preview-main {
    @apply flex-1 opacity-0;
}

.preview-new {
    @apply flex-1 bg-base-content/10 animate-pulse;
}
</style>
