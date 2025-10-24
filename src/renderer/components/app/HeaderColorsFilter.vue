<script setup lang="ts">
import { computed } from "vue";
import { useColorStore } from "@/store/colors";

const colorStore = useColorStore();

const isRed = computed(() => ({
    "bg-error": colorStore.colors.includes("red")
}));

const isGray = computed(() => ({
    "bg-gray-600": colorStore.colors.includes("gray")
}));

const isBlack = computed(() => ({
    "bg-black": colorStore.colors.includes("black")
}));

const isBlue = computed(() => ({
    "bg-info": colorStore.colors.includes("blue")
}));

const isGreen = computed(() => ({
    "bg-success": colorStore.colors.includes("green")
}));

const isOrange = computed(() => ({
    "bg-warning": colorStore.colors.includes("orange")
}));
</script>

<template>
    <div class="py-2 flex justify-center items-center">
        <slot></slot>
        <div class="h-full flex items-center gap-2.5 px-2">
            <button
                :class="isRed"
                @click="colorStore.add('red')"
                type="button"
                class="rounded-full size-3 border border-error/80"
            ></button>
            <button
                :class="isOrange"
                @click="colorStore.add('orange')"
                type="button"
                class="rounded-full size-3 border border-warning/80"
            ></button>
            <button
                :class="isBlue"
                @click="colorStore.add('blue')"
                type="button"
                class="rounded-full size-3 border border-info/80"
            ></button>
            <button
                :class="isGreen"
                @click="colorStore.add('green')"
                type="button"
                class="rounded-full size-3 border border-success/80"
            ></button>
            <button
                :class="isBlack"
                @click="colorStore.add('black')"
                type="button"
                class="rounded-full size-3 border border-black/80"
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
