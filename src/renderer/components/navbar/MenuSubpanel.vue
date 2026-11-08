<script setup lang="ts">
import { inject, onMounted, ref, type Ref } from 'vue';
import { ChevronLeftIcon } from '@heroicons/vue/20/solid';

defineProps<{ title: string }>();

const view = inject<Ref<string>>('menuView', ref('root'));
const backRef = ref<HTMLButtonElement | null>(null);

onMounted(() => backRef.value?.focus());
</script>

<template>
    <div
        data-keep-open
        class="flex flex-col"
    >
        <div class="flex items-center gap-1 h-8 pr-1 mb-1 border-b border-base-content/10">
            <button
                ref="backRef"
                type="button"
                :aria-label="$t('menu.back')"
                class="grid place-items-center size-6 rounded-md text-base-content/60 hover:bg-base-content/10 hover:text-base-content cursor-pointer"
                @click="view = 'root'"
            >
                <ChevronLeftIcon class="size-4" />
            </button>
            <span class="text-[0.8rem] font-medium">{{ title }}</span>
            <span class="ml-auto"><slot name="action" /></span>
        </div>
        <slot />
    </div>
</template>
