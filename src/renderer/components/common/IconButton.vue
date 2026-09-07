<script setup lang="ts">
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
</script>

<template>
    <button
        type="button"
        :aria-label="label"
        :title="label"
        class="inline-flex items-center justify-center size-8 rounded-lg shrink-0 cursor-pointer transition-colors"
        :class="[
            variant === 'active' || active
                ? 'text-primary bg-primary/10 hover:bg-primary/15'
                : variant === 'danger'
                  ? 'text-base-content/60 hover:bg-error/10 hover:text-error'
                  : 'text-base-content/60 hover:bg-base-content/10 hover:text-base-content'
        ]"
    >
        <slot />
    </button>
</template>
