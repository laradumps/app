<script setup lang="ts">
import { onMounted, onUnmounted, ref, nextTick, watch } from 'vue';
import type { Environment } from '../../../main/storage';
import { screenIcon } from './screen-icons';

const props = defineProps<{
    environments: Environment[];
    visible: boolean;
    showIcons?: boolean;
}>();

const emit = defineEmits<{
    (e: 'environment-selected', environment: Environment): void;
    (e: 'close'): void;
}>();

const dropdownStyle = ref<{ top?: string; left?: string; right?: string; zIndex: number }>({ zIndex: 9999 });

const selectEnvironment = (environment: Environment) => {
    emit('environment-selected', environment);
};

const formattedName = (name: string): string => name?.replace(/[-_.]/g, ' ') || '';

const dropdownRef = ref<HTMLElement | null>(null);

const calculatePosition = () => {
    dropdownStyle.value = {
        top: '-9999px',
        left: '-9999px',
        zIndex: 9999
    };

    nextTick(() => {
        const addButton = document.querySelector('[data-add-env-button]') as HTMLElement;
        const dropdown = dropdownRef.value;

        if (addButton && dropdown) {
            const rect = addButton.getBoundingClientRect();
            const dropdownWidth = dropdown.offsetWidth || 200;

            const top = rect.bottom + 4;

            let left = rect.left + rect.width / 2 - dropdownWidth / 2;

            if (left + dropdownWidth > window.innerWidth - 8) {
                left = window.innerWidth - dropdownWidth - 8;
            }

            if (left < 8) {
                left = 8;
            }

            dropdownStyle.value = {
                top: `${top}px`,
                left: `${left}px`,
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
        ref="dropdownRef"
        class="environment-dropdown menu flex-col flex-nowrap p-2 shadow-lg bg-base-200/95 backdrop-blur-xl rounded-xl border border-base-content/10 w-max min-w-[140px] max-h-[340px] overflow-y-auto fixed mt-1"
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
                <component
                    :is="screenIcon(env.value)"
                    v-if="showIcons"
                    class="w-4 h-4 shrink-0"
                />
                <span class="truncate capitalize text-xs">{{ formattedName(env.value) }}</span>
            </a>
        </li>

        <!-- Empty state -->
        <li v-if="environments.length === 0">
            <span class="flex items-center gap-3 px-3 py-2 text-xs text-base-content/40 cursor-default"
                >No environments available</span
            >
        </li>
    </ul>
</template>
