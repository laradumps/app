<script lang="ts">
import type { Component } from 'vue';

export interface SettingsNavItem {
    id: string;
    label: string;
    icon: Component;
}
</script>

<script setup lang="ts">
defineProps<{
    items: SettingsNavItem[];
    modelValue: string;
}>();

defineEmits<{
    'update:modelValue': [id: string];
}>();
</script>

<template>
    <div class="w-42 shrink-0 bg-base-200/60 border-r border-base-300 flex flex-col">
        <nav class="flex-1 p-2 pt-4 overflow-y-auto">
            <p class="text-[11px] font-semibold text-base-content/40 uppercase tracking-wider px-2 py-2">
                {{ $t('settings.settings') }}
            </p>

            <button
                v-for="item in items"
                :key="item.id"
                @click="$emit('update:modelValue', item.id)"
                :class="[
                    'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors text-left',
                    modelValue === item.id
                        ? 'bg-base-300 text-base-content font-medium'
                        : 'text-base-content/60 hover:bg-base-300/50 hover:text-base-content'
                ]"
            >
                <component
                    :is="item.icon"
                    class="w-4 h-4 shrink-0"
                />
                {{ item.label }}
            </button>
        </nav>
    </div>
</template>
