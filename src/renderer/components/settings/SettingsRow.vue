<script setup lang="ts">
withDefaults(
    defineProps<{
        label?: string;
        hint?: string;
        divider?: boolean;
    }>(),
    { divider: true }
);
</script>

<template>
    <div
        class="flex justify-between items-center gap-4 py-3"
        :class="{ 'border-b border-base-300/50': divider }"
    >
        <div class="min-w-0">
            <span class="text-sm">
                <slot name="label">{{ label }}</slot>
            </span>
            <p
                v-if="hint"
                class="text-xs text-base-content/50 mt-0.5"
            >
                {{ hint }}
            </p>
        </div>
        <div class="shrink-0">
            <slot />
        </div>
    </div>
</template>
