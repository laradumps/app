<script setup>
import { computed } from "vue";
import { useColorStore } from "@/store/colors";

const colorStore = useColorStore();

const isRed = computed(() => ({
    "bg-error": colorStore.colors.includes("error")
}));

const isGray = computed(() => ({
    "bg-gray-600": colorStore.colors.includes("gray")
}));

const isBlue = computed(() => ({
    "bg-info": colorStore.colors.includes("info")
}));

const isGreen = computed(() => ({
    "bg-success": colorStore.colors.includes("success")
}));

const isOrange = computed(() => ({
    "bg-warning": colorStore.colors.includes("warning")
}));
</script>

<template>
    <div class="space-x-2 px-3 flex justify-end items-center">
        <slot></slot>
        <div class="h-full flex items-center gap-2 px-2">
            <button
                :class="isRed"
                @click="colorStore.add('error')"
                type="button"
                class="rounded-full size-3 border border-error"
            ></button>
            <button
                :class="isOrange"
                @click="colorStore.add('warning')"
                type="button"
                class="rounded-full size-3 border border-warning"
            ></button>
            <button
                :class="isBlue"
                @click="colorStore.add('info')"
                type="button"
                class="rounded-full size-3 border border-info"
            ></button>
            <button
                :class="isGreen"
                @click="colorStore.add('success')"
                type="button"
                class="rounded-full size-3 border border-success"
            ></button>
            <button
                :class="isGray"
                @click="colorStore.add('gray')"
                type="button"
                class="rounded-full size-3 border border-gray-500"
            ></button>
        </div>
    </div>
</template>
