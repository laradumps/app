<script setup lang="ts">
import { computed } from "vue";
import { useToastStore } from "@/store/toast";

const toast = useToastStore();
const items = computed(() => toast.all);

const typeClasses = (type: string) => {
    switch (type) {
        case "success":
            return "bg-success text-success-content border-success/30";
        case "warning":
            return "bg-warning text-warning-content border-warning/30";
        case "error":
            return "bg-error text-error-content border-error/30";
        default:
            return "bg-base-200 text-base-content border-base-content/20";
    }
};
</script>

<template>
    <div class="fixed z-[9999] top-12 right-3 flex flex-col gap-3 items-end">
        <TransitionGroup
            name="toast-fade"
            tag="div"
        >
            <div
                v-for="item in items"
                :key="item.id"
                class="shadow border rounded px-3 py-2 text-sm max-w-[60vw]"
                :class="typeClasses(item.type)"
            >
                {{ item.message }}
            </div>
        </TransitionGroup>
    </div>
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
