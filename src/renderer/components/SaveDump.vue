<script setup>
import { ClipboardIcon } from "@heroicons/vue/24/outline";

import { ref } from "vue";
import IconSave from "@/components/Icons/IconSave.vue";
import { CheckIcon } from "@heroicons/vue/20/solid";

const showCheck = ref(false);

const save = () => {
    showCheck.value = true;

    setTimeout(() => {
        showCheck.value = false;
    }, 2000);
};
</script>
<template>
    <div
        @click="save"
        class="cursor-pointer transition-all"
    >
        <CheckIcon
            v-if="showCheck"
            class="w-4 h-4 text-success"
        />
        <IconSave
            v-if="!showCheck"
            class="cursor-pointer w-3 h-3 hover:opacity-75"
            id="saveIcon"
        />
    </div>
</template>
