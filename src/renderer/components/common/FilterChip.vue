<script setup lang="ts">
import { XMarkIcon } from '@heroicons/vue/24/solid';

defineProps<{
    label: string;
}>();

defineEmits<{
    remove: [];
}>();
</script>

<template>
    <button
        type="button"
        @click="$emit('remove')"
        class="group inline-flex items-center gap-1 h-6 pl-2 pr-1 rounded-full text-[11px] font-medium whitespace-nowrap max-w-[150px] bg-primary/10 text-primary border border-primary/25 hover:bg-primary/15 transition-colors"
        :data-tippy-content="`Remove ${label}`"
    >
        <span class="truncate capitalize">{{ label }}</span>
        <XMarkIcon class="size-3 shrink-0 opacity-60 group-hover:opacity-100" />
    </button>
</template
