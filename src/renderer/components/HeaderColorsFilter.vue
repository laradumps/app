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
    "border-white": selectedColors.colors.includes("black")
}));

const isRed = computed(() => ({
    "border-white": selectedColors.colors.includes("red")
}));

const isGray = computed(() => ({
    "border-white": selectedColors.colors.includes("gray")
}));

const isBlue = computed(() => ({
    "border-white": selectedColors.colors.includes("blue")
}));

const isGreen = computed(() => ({
    "border-white": selectedColors.colors.includes("green")
}));

const isOrange = computed(() => ({
    "border-white": selectedColors.colors.includes("orange")
}));
</script>

<template>
    <div class="space-x-2 flex justify-end items-center"
         v-if="screenStore.screen !== 'Queries' && hasColor">
        <div class="h-full grid gap-2 grid-cols-3 tiny:grid-cols-6 opacity-75">
            <button
                :class="isDark"
                @click="selectedColors.add('black')"
                value="black"
                type="button"
                class="badge badge-xs bg-[black] border-gray-800"
            ></button>

            <button
                :class="isRed"
                @click="selectedColors.add('red')"
                value="red"
                type="button"
                class="badge badge-xs bg-[#ff0000]"
            ></button>

            <button
                :class="isOrange"
                @click="selectedColors.add('orange')"
                type="button"
                class="badge badge-xs bg-[orange]"
            ></button>

            <button
                :class="isBlue"
                @click="selectedColors.add('blue')"
                type="button"
                class="badge badge-xs bg-[blue]"
            ></button>

            <button
                :class="isGreen"
                @click="selectedColors.add('green')"
                type="button"
                class="badge badge-xs bg-[green]"
            ></button>

            <button
                :class="isGray"
                @click="selectedColors.add('gray')"
                type="button"
                class="badge badge-xs bg-[gray]"
            ></button>
        </div>
    </div>
</template>
