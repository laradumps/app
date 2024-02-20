<template>
    <a
        class="justify-center cursor-pointer text-base-500 group flex items-center p-2"
        @click="privacyStore.toggle()"
    >
        <div v-if="privacyStore.isOpen">
            <EyeIcon class="h-5 w-5 hover:text-base-900 dark:text-base-400 dark:hover:text-base-200" />
        </div>
        <div v-if="!privacyStore.isOpen">
            <EyeSlashIcon class="h-5 w-5 hover:text-base-900 dark:text-base-400 dark:hover:text-base-300" />
        </div>
    </a>
</template>

<script setup>
import { usePrivacy } from "@/store/privacy";
import { EyeIcon, EyeSlashIcon } from "@heroicons/vue/24/outline";

const privacyStore = usePrivacy();
</script>
