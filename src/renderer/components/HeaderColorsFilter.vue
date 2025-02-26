<script setup>
import { computed } from "vue";
import { useColorStore } from "@/store/colors";
import { useScreenStore } from "@/store/screen";

const selectedColors = useColorStore();
const screenStore = useScreenStore();

defineProps({
    hasColor: {
        type: Boolean,
        required: true
    }
});

const isDark = computed(() => ({
    "!bg-black/40": selectedColors.colors.includes("black")
}));

const isRed = computed(() => ({
    "!bg-error/40": selectedColors.colors.includes("red")
}));

const isGray = computed(() => ({
    "!bg-gray-600/40": selectedColors.colors.includes("gray")
}));

const isBlue = computed(() => ({
    "!bg-info/40": selectedColors.colors.includes("blue")
}));

const isGreen = computed(() => ({
    "!bg-success/40": selectedColors.colors.includes("green")
}));

const isOrange = computed(() => ({
    "!bg-warning/40": selectedColors.colors.includes("orange")
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
                value="black"
                type="button"
                class="rounded-full size-2.5 bg-black"
            ></button>

            <button
                :class="isRed"
                @click="selectedColors.add('red')"
                value="red"
                type="button"
                class="rounded-full size-2.5 bg-error"
            ></button>

            <button
                :class="isOrange"
                @click="selectedColors.add('orange')"
                type="button"
                class="rounded-full size-2.5 bg-warning"
            ></button>

            <button
                :class="isBlue"
                @click="selectedColors.add('blue')"
                type="button"
                class="rounded-full size-2.5 bg-info"
            ></button>

            <button
                :class="isGreen"
                @click="selectedColors.add('green')"
                type="button"
                class="rounded-full size-2.5 bg-success"
            ></button>

            <button
                :class="isGray"
                @click="selectedColors.add('gray')"
                type="button"
                class="rounded-full size-2.5 bg-gray-500"
            ></button>
        </div>
    </div>
</template>
