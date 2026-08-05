<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
    defineProps<{
        count?: number;
        noun?: string;
    }>(),
    { noun: '' }
);

const pluralize = (word: string): string => {
    if (/[^aeiou]y$/i.test(word)) return word.slice(0, -1) + 'ies';
    if (/(s|x|z|ch|sh)$/i.test(word)) return word + 'es';
    return word + 's';
};

const countLabel = computed(() => {
    if (props.count === undefined) return '';
    if (!props.noun) return String(props.count);
    const word = props.count === 1 ? props.noun : pluralize(props.noun);
    return `${props.count} ${word}`;
});
</script>

<template>
    <div class="flex items-center justify-between w-full h-9 px-3 gap-3 border-b border-base-content/10">
        <!-- Left: filter + active chips + count -->
        <div class="flex items-center gap-2 min-w-0">
            <div class="shrink-0">
                <slot name="filter" />
            </div>

            <div class="flex items-center gap-1.5 min-w-0 overflow-hidden">
                <slot name="chips" />
            </div>

            <div
                v-if="$slots.filter && count !== undefined"
                class="w-px h-4 bg-base-content/10 shrink-0"
            ></div>

            <span
                v-if="count !== undefined"
                class="shrink-0 text-xs text-base-content/40 tabular-nums whitespace-nowrap select-none"
            >
                {{ countLabel }}
            </span>
        </div>

        <!-- Right: view-specific actions -->
        <div class="flex items-center gap-1 shrink-0">
            <slot name="right" />
        </div>
    </div>
</template>
