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
    "bg-red-500": selectedColors.colors.includes("red")
}));

const isGray = computed(() => ({
    "bg-gray-500": selectedColors.colors.includes("gray")
}));

const isBlue = computed(() => ({
    "bg-blue-500": selectedColors.colors.includes("blue")
}));

const isGreen = computed(() => ({
    "bg-green-500": selectedColors.colors.includes("green")
}));

const isOrange = computed(() => ({
    "bg-orange-500": selectedColors.colors.includes("orange")
}));
</script>

<template>
    <div
        class="space-x-2 flex justify-end items-center"
        v-if="screenStore.screen !== 'Queries' && hasColor"
    >
        <div class="h-full flex gap-2">
            <button
                :class="isDark"
                @click="selectedColors.add('black')"
                value="black"
                type="button"
                class="badge badge-xs border-black"
            ></button>

            <button
                :class="isRed"
                @click="selectedColors.add('red')"
                value="red"
                type="button"
                class="badge badge-xs border-[#ff0000]"
            ></button>

            <button
                :class="isOrange"
                @click="selectedColors.add('orange')"
                type="button"
                class="badge badge-xs border-[orange]"
            ></button>

            <button
                :class="isBlue"
                @click="selectedColors.add('blue')"
                type="button"
                class="badge badge-xs border-[blue]"
            ></button>

            <button
                :class="isGreen"
                @click="selectedColors.add('green')"
                type="button"
                class="badge badge-xs border-[green]"
            ></button>

            <button
                :class="isGray"
                @click="selectedColors.add('gray')"
                type="button"
                class="badge badge-xs border-[gray]"
            ></button>
        </div>
    </div>
</template>
