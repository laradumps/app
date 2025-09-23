<script setup>
import { ref } from "vue";
import { CogIcon, HomeIcon } from "@heroicons/vue/24/outline";

const inSettingPage = ref(false);

const togglePage = () => {
    inSettingPage.value = !inSettingPage.value;
};
</script>

<template>
    <div class="-mr-2">
        <div class="px-1 border-l border-base-content/20 flex items-center justify-center">
            <RouterLink
                :to="inSettingPage ? '/' : '/settings'"
                @click="togglePage"
                class="p-2 hover:bg-base-200 text-base-content cursor-pointer rounded-md"
            >
                <component
                    :is="inSettingPage ? HomeIcon : CogIcon"
                    class="w-5"
                />
            </RouterLink>
        </div>
    </div>
</template>
