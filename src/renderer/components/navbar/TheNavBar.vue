<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';

const platform = ref('');

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
</script>

<template>
    <div class="flex text-base-content items-center gap-2 h-10 px-3 shrink-0 z-100 border-b border-base-content/10">
        <div
            id="navbar-views"
            class="flex items-center self-stretch min-w-0"
            :class="{ 'ml-[4.6rem]': platform === 'darwin' }"
        ></div>

        <div class="flex-1 self-stretch min-w-20 select-none [-webkit-app-region:drag]"></div>

        <div
            id="navbar-actions"
            class="flex items-center"
        ></div>
    </div>
</template>
