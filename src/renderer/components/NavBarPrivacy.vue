<template>
    <a
        class="justify-center cursor-pointer group flex items-center p-2"
        @click="privacyStore.toggle()"
    >
        <div v-if="privacyStore.isOpen">
            <EyeIcon class="h-5 w-5 text-base hover:opacity-75" />
        </div>
        <div v-if="!privacyStore.isOpen">
            <EyeSlashIcon class="h-5 w-5 text-base hover:opacity-75" />
        </div>
    </a>
</template>

<script setup>
import { usePrivacy } from "@/store/privacy";
import { EyeIcon, EyeSlashIcon } from "@heroicons/vue/24/outline";

const privacyStore = usePrivacy();
</script>
