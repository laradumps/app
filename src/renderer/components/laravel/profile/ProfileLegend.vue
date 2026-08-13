<script setup lang="ts">
import type { ProfileSummary } from '@/store/profile';
import { legendDotColor, typeLabels } from './profileHelpers';

defineProps<{
    byType: ProfileSummary['by_type'];
    hiddenTypes: Set<string>;
}>();

const emit = defineEmits<{
    (e: 'toggle', type: string): void;
}>();
</script>

<template>
    <div class="shrink-0 px-3 py-2 border-b border-base-content/10">
        <div class="flex flex-wrap gap-1.5">
            <button
                v-for="(data, type) in byType"
                :key="type"
                @click="emit('toggle', type as string)"
                class="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded transition-all select-none"
                :class="[
                    hiddenTypes.has(type as string) ? 'opacity-40 line-through' : 'opacity-100',
                    'hover:bg-base-content/10 cursor-pointer'
                ]"
                :title="
                    hiddenTypes.has(type as string)
                        ? `${$t('profiler.show')} ${typeLabels[type] || type}`
                        : `${$t('profiler.hide')} ${typeLabels[type] || type}`
                "
            >
                <span
                    class="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    :class="legendDotColor(type as string)"
                ></span>
                <span>{{ typeLabels[type as string] || type }} ({{ data.count }})</span>
            </button>
        </div>
    </div>
</template>
