<script setup>
import IconPause from '@/components/Icons/IconPause.vue';
import IconPlay from '@/components/Icons/IconPlay.vue';
import IconButton from '@/components/common/IconButton.vue';
import { usePausePayloadStore } from '@/store/pauses';

const pauseStore = usePausePayloadStore();
</script>

<template>
    <div class="flex gap-3 items-center">
        <IconButton
            :label="$t('pause')"
            :active="pauseStore.is_paused"
            @click="pauseStore.toggle()"
        >
            <IconPause
                v-if="!pauseStore.is_paused"
                class="size-4"
            />
            <IconPlay
                v-else
                class="size-4"
            />
        </IconButton>
    </div>
</template>
