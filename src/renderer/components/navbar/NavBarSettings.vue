<script setup>
import { CogIcon } from '@heroicons/vue/24/outline';
import IconButton from '@/components/common/IconButton.vue';

const openSettings = () => {
    const modal = document.getElementById('settings_modal');
    modal?.showModal();
};
</script>

<template>
    <IconButton
        label="Settings"
        @click="openSettings"
    >
        <CogIcon class="size-4" />
    </IconButton>
</template>
