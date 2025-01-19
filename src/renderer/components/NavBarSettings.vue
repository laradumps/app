<script setup>
import { ref } from "vue";
import { CogIcon, HomeIcon } from "@heroicons/vue/24/outline";

const isSettings = ref(false);

const togglePage = () => {
    isSettings.value = !isSettings.value;
};
</script>

<template>
    <div>
        <RouterLink
            :to="isSettings ? '/' : '/settings'"
            @click="togglePage"
            class="w-[32px] !h-[34px] tab p-1.5 py-2 hover:bg-base-200 text-base-content cursor-pointer rounded-md"
        >
            <component
                :is="isSettings ? HomeIcon : CogIcon"
                class="w-5"
            />
        </RouterLink>
    </div>
</template>
