<template>
    <div class="space-x-2 flex justify-end items-center">
        <div
            class="h-full grid gap-2 grid-cols-3 tiny:grid-cols-6"
            v-if="screenStore.screen !== 'Queries' && hasColor"
        >
            <button
                :class="isDark"
                @click="selectedColors.add('black')"
                value="black"
                type="button"
                class="rounded-full btn-outline-black h-[14px] w-[14px]"
            ></button>

            <button
                :class="isRed"
                @click="selectedColors.add('red')"
                value="red"
                type="button"
                class="rounded-full btn-outline-red h-[14px] w-[14px]"
            ></button>

            <button
                :class="isOrange"
                @click="selectedColors.add('orange')"
                type="button"
                class="rounded-full btn-outline-orange h-[14px] w-[14px]"
            ></button>

            <button
                :class="isBlue"
                @click="selectedColors.add('blue')"
                type="button"
                class="rounded-full btn-outline-blue h-[14px] w-[14px]"
            ></button>

            <button
                :class="isGreen"
                @click="selectedColors.add('green')"
                type="button"
                class="rounded-full btn-outline-green h-[14px] w-[14px]"
            ></button>

            <button
                :class="isGray"
                @click="selectedColors.add('gray')"
                type="button"
                class="rounded-full btn-outline-gray h-[14px] w-[14px]"
            ></button>
        </div>

        <div v-if="screenStore.screen === 'Queries'">
            <HeaderQueryRequests
                :payload="payload"
                :total="total"
            />
        </div>
        <GlobalSearch />
    </div>
</template>

<script setup>
import { computed } from "vue";
import { useColorStore } from "@/store/colors";
import GlobalSearch from "@/components/GlobalSearch.vue";
import HeaderQueryRequests from "@/components/HeaderQueryRequests.vue";
import { useScreenStore } from "@/store/screen";

const selectedColors = useColorStore();
const screenStore = useScreenStore();

defineProps({
    total: {
        type: Number,
        default: 0,
        required: true
    },
    hasColor: {
        type: Boolean,
        required: true
    },
    payload: {
        type: Object
    }
});

const isDark = computed(() => ({
    "!bg-black dark:!bg-base-600 !text-white": selectedColors.colors.includes("black")
}));

const isRed = computed(() => ({
    "!bg-red-500 dark:bg-red-700 !text-white": selectedColors.colors.includes("red")
}));

const isGray = computed(() => ({
    "!bg-gray-500 dark:bg-gray-700 !text-white": selectedColors.colors.includes("gray")
}));

const isBlue = computed(() => ({
    "!bg-blue-500 dark:bg-blue-700 !text-white": selectedColors.colors.includes("blue")
}));

const isGreen = computed(() => ({
    "!bg-green-500 dark:bg-green-700 !text-white": selectedColors.colors.includes("green")
}));

const isOrange = computed(() => ({
    "!bg-orange-500 dark:!bg-orange-700 !text-white": selectedColors.colors.includes("orange")
}));
</script>
