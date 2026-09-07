<script setup>
import { computed, watch } from 'vue';
import { useSavedDumpsStore } from '@/store/saved-dumps';
import IconButton from '@/components/common/IconButton.vue';
import { deepClone } from '@/utils/deep_clone';
import { BookmarkIcon } from '@heroicons/vue/24/outline';

const savedStore = useSavedDumpsStore();

const hasSaved = computed(() => savedStore.count > 0);

const openSavedWindow = () => {
    if (!hasSaved.value) return;

    const payload = deepClone(savedStore.all);

    window.ipcRenderer.send('screen-window:show', {
        screen: 'saved',
        payload,
        position: {}
    });
};

watch(
    () => savedStore.count,
    () => {
        const payload = deepClone(savedStore.all);
        window.ipcRenderer.send('send-screen-window-update', {
            screen: 'saved',
            payload
        });
    }
);
</script>

<template>
    <IconButton
        v-if="hasSaved"
        :label="$t('menu.saved_dumps')"
        @click="openSavedWindow"
    >
        <BookmarkIcon class="size-4" />
    </IconButton>
</template>
