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

const dropdownPosition = ref({ top: 0, left: 0 });

const dropdownStyle = computed(() => ({
    top: `${dropdownPosition.value.top}px`,
    left: `${dropdownPosition.value.left}px`,
    zIndex: 9999
}));

const selectEnvironment = (environment: Environment) => {
    emit('environment-selected', environment);
};

const formattedName = (name: string): string => name?.replace(/[-_.]/g, ' ') || '';

const calculatePosition = () => {
    nextTick(() => {
        const addButton = document.querySelector('[data-add-env-button]') as HTMLElement;
        if (addButton) {
            const rect = addButton.getBoundingClientRect();
            const dropdownWidth = 224;
            const dropdownHeight = props.environments.length * 40 + 16;

            let left = rect.right - dropdownWidth;
            let top = rect.bottom + 4;

            if (left < 8) {
                left = rect.left;
            }

            if (left + dropdownWidth > window.innerWidth - 8) {
                left = window.innerWidth - dropdownWidth - 8;
            }

            if (top + dropdownHeight > window.innerHeight - 8) {
                top = rect.top - dropdownHeight - 4;
            }

            dropdownPosition.value = { top, left };
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
        class="environment-dropdown menu menu-sm bg-base-200 rounded-box w-56 shadow-lg border border-base-300 fixed mt-1"
        :style="dropdownStyle"
    >
        <li
            v-for="env in environments"
            :key="env.id"
        >
            <a
                @click="selectEnvironment(env)"
                class="capitalize"
            >
                {{ formattedName(env.value) }}
            </a>
        </li>

        <!-- Empty state -->
        <li v-if="environments.length === 0">
            <span class="text-base-content/50 cursor-default">No environments available</span>
        </li>
    </ul>
</template>
