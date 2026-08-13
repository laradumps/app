<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
    modelValue: boolean;
    title?: string;
    width?: string;
    id?: string;
}>();

const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void;
}>();

const isOpen = ref(props.modelValue);
const drawerId = props.id || 'base-drawer';

watch(
    () => props.modelValue,
    (val) => {
        isOpen.value = val;
    }
);

watch(isOpen, (val) => {
    emit('update:modelValue', val);
});

const close = () => {
    isOpen.value = false;
};
</script>

<template>
    <Teleport to="body">
        <div class="drawer drawer-end z-[999]">
            <input
                :id="drawerId"
                v-model="isOpen"
                type="checkbox"
                class="drawer-toggle"
            />
            <div class="drawer-side">
                <label
                    :for="drawerId"
                    aria-label="close sidebar"
                    class="drawer-overlay"
                ></label>
                <div
                    class="min-h-full bg-base-100 text-base-content shadow-xl flex flex-col"
                    :style="{ width: width || '400px' }"
                >
                    <!-- Header -->
                    <div
                        v-if="title"
                        class="flex items-center justify-between px-4 py-3 border-b border-base-content/10 sticky top-0 bg-base-100 z-10"
                    >
                        <span class="text-lg font-semibold">{{ title }}</span>
                        <button
                            @click="close"
                            class="btn btn-ghost btn-sm btn-circle"
                        >
                            ✕
                        </button>
                    </div>

                    <!-- Content -->
                    <div class="flex-1 overflow-auto">
                        <slot></slot>
                    </div>
                </div>
            </div>
        </div>
    </Teleport>
</template>
