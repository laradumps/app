<script setup>
import { CogIcon } from '@heroicons/vue/24/outline';
import MenuRow from '@/components/navbar/MenuRow.vue';

const openSettings = () => {
    const modal = document.getElementById('settings_modal');
    modal?.showModal();
};
</script>

<template>
    <MenuRow
        :label="$t('settings.settings')"
        @click="openSettings"
    >
        <CogIcon class="size-4" />
    </MenuRow>
</template>
