<script setup lang="ts">
import { InformationCircleIcon } from '@heroicons/vue/24/outline';

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
        <div class="min-w-0 flex items-center gap-1.5">
            <span class="text-sm font-medium">
                <slot name="label">{{ label }}</slot>
            </span>
            <span
                v-if="hint"
                class="tooltip tooltip-right before:max-w-56 before:text-left"
                :data-tip="hint"
            >
                <InformationCircleIcon
                    tabindex="0"
                    role="img"
                    :aria-label="hint"
                    class="size-3.5 text-base-content/40 hover:text-base-content/70 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
            </span>
        </div>
        <div class="shrink-0">
            <slot />
        </div>
    </div>
</template>
