<script setup lang="ts">
import { computed, inject, onMounted, onUnmounted, ref, type Ref } from 'vue';
import { TrashIcon } from '@heroicons/vue/24/outline';
import IconButton from '@/components/common/IconButton.vue';
import { useScreenStore } from '@/store/screen';

const props = withDefaults(
    defineProps<{
        count?: number;
        noun?: string;
        canClear?: boolean;
        onClear?: () => void;
    }>(),
    { noun: '' }
);

const root = ref<HTMLElement | null>(null);
const screenStore = useScreenStore();
const screenName = inject<Ref<string> | null>('screenName', null);

const onClearShortcut = () => {
    if (props.onClear && props.canClear && root.value?.isConnected && screenName?.value === screenStore.screen) {
        props.onClear();
    }
};

onMounted(() => window.ipcRenderer.on('app:local-shortcut-execute::clear_screen', onClearShortcut));
onUnmounted(() => window.ipcRenderer.removeListener('app:local-shortcut-execute::clear_screen', onClearShortcut));

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
    <div
        ref="root"
        class="@container relative flex items-center w-full h-10 pl-4 pr-2.5 gap-3 border-b border-base-content/[0.06]"
    >
        <div class="flex flex-1 items-center gap-2 min-w-0">
            <slot name="title" />

            <span
                v-if="count !== undefined"
                class="shrink-0 tabular-nums whitespace-nowrap select-none"
                :class="
                    $slots.title ? 'text-xs text-base-content/40' : 'text-[13px] font-semibold text-base-content/90'
                "
            >
                {{ countLabel }}
            </span>

            <div class="flex items-center gap-1.5 min-w-0 overflow-hidden">
                <slot name="chips" />
            </div>
        </div>

        <div class="flex items-center gap-0.5 shrink-0">
            <slot name="filter" />
            <slot name="right" />
            <IconButton
                v-if="onClear"
                :label="$t('clear_screen')"
                variant="danger"
                :disabled="!canClear"
                @click="onClear()"
            >
                <TrashIcon class="w-4" />
            </IconButton>
        </div>
    </div>
</template>
