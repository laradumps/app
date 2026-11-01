<script setup lang="ts">
import { defineProps, onMounted, onUnmounted, ref } from 'vue';
import NavBarProjectSwitcher from '@/components/navbar/NavBarProjectSwitcher.vue';

const platform = ref('');
const isListeningModalOpen = ref(false);

defineProps({
    inSavedDumpsWindow: {
        type: Boolean,
        default: false
    }
});

const onPlatformReply = (_event: unknown, args: any) => {
    platform.value = args;
};

onMounted(() => {
    window.ipcRenderer.send('platform');
    window.ipcRenderer.on('platform.reply', onPlatformReply);
});

onUnmounted(() => {
    window.ipcRenderer.removeListener('platform.reply', onPlatformReply);
});

const modalOpen = () => (isListeningModalOpen.value = true);
const modalClose = () => (isListeningModalOpen.value = false);
</script>

<template>
    <div class="flex text-base-content items-center gap-2 h-10 px-3 shrink-0 z-100 border-b border-base-content/10">
        <div
            id="navbar-views"
            class="flex items-center self-stretch min-w-0"
            :class="{ 'ml-[4.6rem]': platform === 'darwin' }"
        ></div>

        <div
            @click="modalClose"
            class="flex-1 self-stretch min-w-6 select-none"
            :style="{
                '-webkit-app-region': isListeningModalOpen ? 'no-drag' : 'drag'
            }"
        ></div>

        <NavBarProjectSwitcher
            v-if="!inSavedDumpsWindow"
            @modal-open="modalOpen"
            @modal-close="modalClose"
        />
    </div>
</template>
