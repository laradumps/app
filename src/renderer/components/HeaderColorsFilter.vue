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
    "!bg-black": selectedColors.colors.includes("black")
}));

const isRed = computed(() => ({
    "!bg-error": selectedColors.colors.includes("red")
}));

const isGray = computed(() => ({
    "!bg-gray-600": selectedColors.colors.includes("gray")
}));

const isBlue = computed(() => ({
    "!bg-info": selectedColors.colors.includes("blue")
}));

const isGreen = computed(() => ({
    "!bg-success": selectedColors.colors.includes("green")
}));

const isOrange = computed(() => ({
    "!bg-warning": selectedColors.colors.includes("orange")
}));
</script>

<template>
    <div
        class="space-x-2 flex justify-end items-center"
        v-if="screenStore.screen !== 'queries' && hasColor"
    >
        <div class="h-full flex gap-2 px-2">
            <button
                :class="isDark"
                @click="selectedColors.add('black')"
                value="black"
                type="button"
                class="p-1.2 badge badge-xs bg-black/50 hover:bg-black"
            ></button>

            <button
                :class="isRed"
                @click="selectedColors.add('red')"
                value="red"
                type="button"
                class="p-1.2 badge badge-xs bg-error/50 hover:bg-error"
            ></button>

            <button
                :class="isOrange"
                @click="selectedColors.add('orange')"
                type="button"
                class="p-1.2 badge badge-xs bg-warning/50 hover:bg-warning"
            ></button>

            <button
                :class="isBlue"
                @click="selectedColors.add('blue')"
                type="button"
                class="p-1.2 badge badge-xs bg-info/50 hover:bg-info"
            ></button>

            <button
                :class="isGreen"
                @click="selectedColors.add('green')"
                type="button"
                class="p-1.2 badge badge-xs bg-success/50 hover:bg-success"
            ></button>

            <button
                :class="isGray"
                @click="selectedColors.add('gray')"
                type="button"
                class="p-1.2 badge badge-xs bg-gray-500/50 hover:bg-gray-500"
            ></button>
        </div>
    </div>
</template>
