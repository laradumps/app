<script setup lang="ts">
import { inject } from 'vue';

withDefaults(
    defineProps<{
        label: string;
        variant?: 'base' | 'active' | 'danger';
        active?: boolean;
    }>(),
    {
        variant: 'base',
        active: false
    }
);

const asRow = inject('iconButtonRow', false);
</script>

<template>
    <button
        type="button"
        :aria-label="label"
        :title="asRow ? undefined : label"
        class="inline-flex items-center shrink-0 cursor-pointer transition-colors"
        :class="[
            asRow
                ? 'w-full h-8 justify-start gap-2.5 px-2 rounded-md text-[0.8rem]'
                : 'justify-center size-8 rounded-lg',
            variant === 'active' || active
                ? 'text-primary bg-primary/10 hover:bg-primary/15'
                : variant === 'danger'
                  ? 'text-base-content/60 hover:bg-error/10 hover:text-error'
                  : 'text-base-content/60 hover:bg-base-content/10 hover:text-base-content'
        ]"
    >
        <slot />
        <span
            v-if="asRow"
            class="truncate"
            >{{ label }}</span
        >
    </button>
</template>
