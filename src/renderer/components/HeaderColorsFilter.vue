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
    },
    payload: {
        type: Object
    }
});

const isDark = computed(() => ({
    "bg-black": selectedColors.colors.includes("black")
}));

const isRed = computed(() => ({
    "bg-red-500": selectedColors.colors.includes("error")
}));

const isGray = computed(() => ({
    "bg-gray-500": selectedColors.colors.includes("neutral")
}));

const isBlue = computed(() => ({
    "bg-blue-500": selectedColors.colors.includes("info")
}));

const isGreen = computed(() => ({
    "bg-green-500": selectedColors.colors.includes("success")
}));

const isOrange = computed(() => ({
    "bg-orange-500": selectedColors.colors.includes("warning")
}));
</script>

<template>
    <div
        class="space-x-2 flex justify-end items-center"
        v-if="screenStore.screen !== 'Queries' && hasColor"
    >
        <div class="h-full flex gap-2 px-2">
            <button
                :class="isDark"
                @click="selectedColors.add('black')"
                value="black"
                type="button"
                class="badge badge-xs border-black"
            ></button>

            <button
                :class="isRed"
                @click="selectedColors.add('error')"
                value="red"
                type="button"
                class="badge badge-xs border-error"
            ></button>

            <button
                :class="isOrange"
                @click="selectedColors.add('warning')"
                type="button"
                class="badge badge-xs border-warning"
            ></button>

            <button
                :class="isBlue"
                @click="selectedColors.add('info')"
                type="button"
                class="badge badge-xs border-info"
            ></button>

            <button
                :class="isGreen"
                @click="selectedColors.add('success')"
                type="button"
                class="badge badge-xs border-success"
            ></button>

            <button
                :class="isGray"
                @click="selectedColors.add('neutral')"
                type="button"
                class="badge badge-xs border-neutral"
            ></button>
        </div>
    </div>
</template>
