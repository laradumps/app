<script setup>
import IconPause from '@/components/Icons/IconPause.vue';
import IconPlay from '@/components/Icons/IconPlay.vue';
import { usePausePayloadStore } from '@/store/pause.js';

const pauseStore = usePausePayloadStore();
</script>

<template>
    <div class="flex gap-3 items-center">
        <button
            :title="$t('pause')"
            class="p-2 hover:bg-base-200 rounded-md"
            @click="pauseStore.toggle()"
        >
            <IconPause v-if="!pauseStore.is_paused" />
            <IconPlay
                v-else
                class="size-4 text-warning"
            />
        </button>
    </div>
</template>
