<script setup>
import { CogIcon } from '@heroicons/vue/24/outline';
import IconButton from '@/components/common/IconButton.vue';

const openSettings = () => {
    const modal = document.getElementById('settings_modal');
    modal?.showModal();
};
</script>

<template>
    <div class="border-l border-base-content/10 pl-2 ml-1 flex items-center">
        <IconButton
            label="Settings"
            @click="openSettings"
        >
            <CogIcon class="size-4" />
        </IconButton>
    </div>
</template>
