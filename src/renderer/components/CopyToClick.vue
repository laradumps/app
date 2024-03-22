<script setup>
import { CheckIcon } from "@heroicons/vue/20/solid";
import { ClipboardIcon } from "@heroicons/vue/24/outline";

import { ref } from "vue";

const showCheck = ref(false);

const copyDump = () => {
    showCheck.value = true;

    setTimeout(() => {
        showCheck.value = false;
    }, 2000);
};
</script>
<template>
    <div
        @click="copyDump"
        class="cursor-pointer transition-all"
    >
        <CheckIcon
            v-if="showCheck"
            class="w-5 h-5 text-success"
        />
        <ClipboardIcon
            v-if="!showCheck"
            class="w-4 h-4"
            id="saveIcon"
        />
    </div>
</template>
