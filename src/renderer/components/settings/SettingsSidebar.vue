<script lang="ts">
import type { Component } from 'vue';

export interface SettingsNavItem {
    id: string;
    label: string;
    sub: string;
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
    <div class="w-52 shrink-0 bg-base-200/60 border-r border-base-300 flex flex-col">
        <nav
            :aria-label="$t('settings.settings')"
            class="flex-1 p-2 pt-4 overflow-y-auto flex flex-col gap-0.5"
        >
            <p class="text-[11px] font-semibold text-base-content/40 uppercase tracking-wider px-2 py-2">
                {{ $t('settings.settings') }}
            </p>

            <button
                v-for="item in items"
                :key="item.id"
                :aria-current="modelValue === item.id ? 'page' : undefined"
                @click="$emit('update:modelValue', item.id)"
                :class="[
                    'w-full flex items-start gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition-colors',
                    modelValue === item.id
                        ? 'bg-base-300 text-base-content'
                        : 'text-base-content/70 hover:bg-base-300/50 hover:text-base-content'
                ]"
            >
                <component
                    :is="item.icon"
                    class="w-4 h-4 shrink-0 mt-0.5"
                />
                <span class="min-w-0 flex flex-col">
                    <span class="text-sm font-medium truncate">{{ item.label }}</span>
                    <span class="text-[11px] text-base-content/50 truncate">{{ item.sub }}</span>
                </span>
            </button>
        </nav>
    </div>
</template>
