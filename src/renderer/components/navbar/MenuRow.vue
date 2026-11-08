<script setup lang="ts">
import { ChevronRightIcon } from '@heroicons/vue/20/solid';

defineProps<{
    label: string;
    value?: string | number;
    drill?: boolean;
    danger?: boolean;
    toggle?: boolean;
}>();

const checked = defineModel<boolean>();
</script>

<template>
    <label
        v-if="toggle"
        data-keep-open
        class="flex items-center w-full h-8 gap-2.5 px-2 rounded-md text-[0.8rem] text-base-content/70 hover:bg-base-content/10 hover:text-base-content cursor-pointer"
    >
        <slot />
        <span class="truncate">{{ label }}</span>
        <input
            v-model="checked"
            type="checkbox"
            class="toggle toggle-xs toggle-accent ml-auto shrink-0"
        />
    </label>
    <button
        v-else
        type="button"
        :data-keep-open="drill ? '' : undefined"
        class="flex items-center w-full h-8 gap-2.5 px-2 rounded-md text-[0.8rem] cursor-pointer transition-colors"
        :class="
            danger
                ? 'text-base-content/70 hover:bg-error/10 hover:text-error'
                : 'text-base-content/70 hover:bg-base-content/10 hover:text-base-content'
        "
    >
        <slot />
        <span class="truncate">{{ label }}</span>
        <span
            v-if="value !== undefined || drill"
            class="ml-auto flex items-center gap-1 shrink-0 text-[0.7rem] text-base-content/45"
        >
            {{ value }}
            <ChevronRightIcon
                v-if="drill"
                class="size-3.5"
            />
        </span>
    </button>
</template>
