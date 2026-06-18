<script setup>
import { CogIcon } from '@heroicons/vue/24/outline';

const openSettings = () => {
    const modal = document.getElementById('settings_modal');
    modal?.showModal();
};
</script>

<template>
    <div class="-mr-2">
        <div class="px-1 border-l border-base-content/20 flex items-center justify-center">
            <button
                @click="openSettings"
                class="p-2 hover:bg-base-200 text-base-content cursor-pointer rounded-md"
            >
                <CogIcon class="w-5" />
            </button>
        </div>
    </div>
</template>
