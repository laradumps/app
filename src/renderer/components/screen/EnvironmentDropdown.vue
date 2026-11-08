<script setup lang="ts">
import { onMounted, onUnmounted, ref, nextTick, watch } from 'vue';
import type { Environment } from '../../../main/storage';
import { screenIcon } from './screen-icons';

const props = defineProps<{
    environments: Environment[];
    visible: boolean;
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
    <div
        v-if="visible"
        ref="dropdownRef"
        class="environment-dropdown fixed mt-1 w-[264px] max-h-[70vh] overflow-y-auto p-1 shadow-lg bg-base-200/95 backdrop-blur-xl rounded-xl border border-base-content/10"
        :style="{ ...dropdownStyle, zIndex: 99999 }"
    >
        <ul class="grid grid-cols-3">
            <li
                v-for="env in environments"
                :key="env.value"
            >
                <button
                    type="button"
                    class="w-full flex flex-col items-center gap-1 px-1 py-1.5 rounded-lg text-[11px] leading-tight text-center capitalize transition-colors cursor-pointer text-base-content/60 hover:bg-base-content/[0.07] hover:text-base-content"
                    @click="selectEnvironment(env)"
                >
                    <component
                        :is="screenIcon(env.value)"
                        class="size-5"
                    />
                    {{ formattedName(env.value) }}
                </button>
            </li>
        </ul>

        <p
            v-if="!environments.length"
            class="px-3 py-3 text-xs text-center text-base-content/40"
        >
            {{ $t('screen_picker.empty') }}
        </p>
    </div>
</template>
