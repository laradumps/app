<script setup>
import { computed } from "vue";
import { useColorStore } from "@/store/colors";
import { useScreenStore } from "@/store/screen";
import { FunnelIcon } from "@heroicons/vue/24/outline/index.js";

const selectedColors = useColorStore();
const screenStore = useScreenStore();

defineProps({
    hasColor: {
        type: Boolean,
        required: true
    },
    dropdownMode: {
        type: Boolean,
        default: false
    }
});

const isDark = computed(() => ({
    "bg-black": selectedColors.colors.includes("black")
}));

const isRed = computed(() => ({
    "bg-red-600": selectedColors.colors.includes("red")
}));

const isGray = computed(() => ({
    "bg-gray-600": selectedColors.colors.includes("gray")
}));

const isBlue = computed(() => ({
    "bg-blue-600": selectedColors.colors.includes("blue")
}));

const isGreen = computed(() => ({
    "bg-green-600": selectedColors.colors.includes("green")
}));

const isOrange = computed(() => ({
    "bg-orange-400": selectedColors.colors.includes("orange")
}));
</script>

<template>
    <div
        class="space-x-2 flex justify-end items-center"
        v-if="screenStore.screen !== 'queries' && hasColor"
    >
        <div class="h-full flex items-center gap-2 px-2">
            <button
                :class="isDark"
                @click="selectedColors.add('black')"
                type="button"
                class="rounded-full size-3 border border-black"
            ></button>
            <button
                :class="isRed"
                @click="selectedColors.add('red')"
                type="button"
                class="rounded-full size-3 border border-red-600"
            ></button>
            <button
                :class="isOrange"
                @click="selectedColors.add('orange')"
                type="button"
                class="rounded-full size-3 border border-orange-400"
            ></button>
            <button
                :class="isBlue"
                @click="selectedColors.add('blue')"
                type="button"
                class="rounded-full size-3 border border-blue-600"
            ></button>
            <button
                :class="isGreen"
                @click="selectedColors.add('green')"
                type="button"
                class="rounded-full size-3 border border-green-600"
            ></button>
            <button
                :class="isGray"
                @click="selectedColors.add('gray')"
                type="button"
                class="rounded-full size-3 border border-gray-500"
            ></button>
        </div>
    </div>
</template>
