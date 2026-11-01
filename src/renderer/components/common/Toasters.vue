<script setup lang="ts">
import { computed } from 'vue';
import { useToastStore } from '@/store/toast';
import { toastHost } from '@/composables/useToastHost';
import { XMarkIcon } from '@heroicons/vue/20/solid';

const toast = useToastStore();
const items = computed(() => toast.all);

const typeClasses = (type: string) => {
    switch (type) {
        case 'success':
            return 'bg-success text-success-content border-success/30';
        case 'warning':
            return 'bg-warning text-warning-content border-warning/30';
        case 'error':
            return 'bg-error text-error-content border-error/30';
        default:
            return 'bg-base-200 text-base-content border-base-content/10';
    }
};
</script>

<template>
    <Teleport :to="toastHost || 'body'">
        <div class="fixed z-[9999] top-12 right-3 flex flex-col gap-3 items-end">
            <TransitionGroup
                name="toast-fade"
                tag="div"
            >
                <div
                    v-for="item in items"
                    :key="item.id"
                    role="status"
                    :aria-live="item.type === 'error' ? 'assertive' : 'polite'"
                    class="shadow border rounded pl-3 pr-1.5 py-2 text-sm max-w-[60vw] flex items-start gap-2"
                    :class="typeClasses(item.type)"
                >
                    <span class="flex-1">{{ item.message }}</span>
                    <button
                        type="button"
                        class="shrink-0 rounded opacity-70 hover:opacity-100 focus-visible:opacity-100"
                        :aria-label="$t('settings.close')"
                        @click="toast.hide(item.id)"
                    >
                        <XMarkIcon class="size-4" />
                    </button>
                </div>
            </TransitionGroup>
        </div>
    </Teleport>
</template>

<style scoped>
.toast-fade-enter-active,
.toast-fade-leave-active {
    transition: all 0.18s ease;
}
.toast-fade-enter-from,
.toast-fade-leave-to {
    opacity: 0;
    transform: translateY(6px) scale(0.98);
}
</style>
