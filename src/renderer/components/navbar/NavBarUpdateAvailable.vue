<script setup lang="ts">
import { SparklesIcon } from "@heroicons/vue/24/outline";

const openUpdateModal = () => {
    const modal = document.getElementById("update_modal") as HTMLDialogElement;
    modal?.showModal();
};
</script>

<template>
    <button
        @click="openUpdateModal"
        class="badge whitespace-nowrap badge-outline badge-warning cursor-pointer text-xs px-2 py-1"
        title="Update Available"
    >
        <SparklesIcon class="h-4 w-4" />
        {{ $t("settings.update_available") }}
    </button>
</template>

<style scoped></style>
