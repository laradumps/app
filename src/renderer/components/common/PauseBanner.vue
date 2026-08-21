<script lang="ts" setup>
import { usePausePayloadStore } from '@/store/pauses';
import { PlayIcon } from '@heroicons/vue/24/outline';

const pausePayloadStore = usePausePayloadStore();
</script>

<template>
    <div
        v-if="pausePayloadStore.is_paused"
        class="bg-warning/10 text-warning text-[10px] px-3 py-1.5 flex items-center gap-2 border-b border-warning/20 shrink-0"
    >
        <PlayIcon class="w-3 h-3" />
        <span>{{ $t('app.inactive_banner') }}</span>
    </div>
</template>
