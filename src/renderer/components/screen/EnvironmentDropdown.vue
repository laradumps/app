<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed, nextTick, watch } from 'vue';
import type { Environment } from '../../../main/storage';

const props = defineProps<{
    environments: Environment[];
    visible: boolean;
}>();

const emit = defineEmits<{
    (e: 'environment-selected', environment: Environment): void;
    (e: 'close'): void;
}>();

const dropdownStyle = ref<{top?: string, left?: string, right?: string, zIndex: number}>({ zIndex: 9999 });

const selectEnvironment = (environment: Environment) => {
    emit('environment-selected', environment);
};

const formattedName = (name: string): string => name?.replace(/[-_.]/g, ' ') || '';

const calculatePosition = () => {
    nextTick(() => {
        const addButton = document.querySelector('[data-add-env-button]') as HTMLElement;
        if (addButton) {
            const rect = addButton.getBoundingClientRect();
            const dropdownHeight = props.environments.length * 40 + 16;

            let top = rect.bottom + 4;
            const right = window.innerWidth - rect.right;

            if (top + dropdownHeight > window.innerHeight - 8) {
                top = rect.top - dropdownHeight - 4;
            }

            dropdownStyle.value = { 
                top: `${top}px`, 
                right: `${right}px`,
                zIndex: 9999
            };
        }
    });
};

const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    const dropdown = target.closest('.environment-dropdown');
    const addButton = target.closest('[data-add-env-button]');

    if (!dropdown && !addButton && props.visible) {
        emit('close');
    }
};

watch(
    () => props.visible,
    (visible) => {
        if (visible) {
            calculatePosition();
        }
    }
);

onMounted(() => {
    document.addEventListener('click', handleClickOutside);
    window.addEventListener('resize', calculatePosition);
    window.addEventListener('scroll', calculatePosition);
});

onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside);
    window.removeEventListener('resize', calculatePosition);
    window.removeEventListener('scroll', calculatePosition);
});
</script>

<template>
    <ul
        v-if="visible"
        class="environment-dropdown menu p-2 shadow-[0_10px_40px_rgba(0,0,0,0.5)] bg-base-200/95 backdrop-blur-xl rounded-xl border border-white/5 w-max min-w-[140px] fixed mt-1"
        :style="{ ...dropdownStyle, zIndex: 99999 }"
    >
        <li
            v-for="env in environments"
            :key="env.id"
        >
            <a
                @click="selectEnvironment(env)"
                class="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-base-content/70 hover:bg-base-content/5 hover:text-base-content"
            >
                <span class="truncate capitalize text-xs">{{ formattedName(env.value) }}</span>
            </a>
        </li>

        <!-- Empty state -->
        <li v-if="environments.length === 0">
            <span class="flex items-center gap-3 px-3 py-2 text-xs text-base-content/40 cursor-default">No environments available</span>
        </li>
    </ul>
</template>
