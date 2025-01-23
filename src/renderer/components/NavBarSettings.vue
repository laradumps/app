<script setup>
import { ref } from "vue";
import { CogIcon, HomeIcon } from "@heroicons/vue/24/outline";

const isSettings = ref(false);

const togglePage = () => {
    isSettings.value = !isSettings.value;
};
</script>

<template>
    <div class="-mr-2">
        <div class="px-1 border-l border-base-content/20 flex items-center justify-center">
            <RouterLink
                :to="isSettings ? '/' : '/settings'"
                @click="togglePage"
                class="py-2 px-1.5 hover:bg-base-200 text-base-content cursor-pointer rounded-md"
            >
                <component
                    :is="isSettings ? HomeIcon : CogIcon"
                    class="w-5"
                />
            </RouterLink>
        </div>
    </div>
</template>
