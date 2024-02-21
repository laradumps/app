<template>
    <div
        class="fixed flex pl-3 bg-white dark:bg-base-900 select-none justify-between text-[11px] text-base-600 bottom-0 w-auto right-0 left-0 z-40 p-1.5 dark:text-base-400 dark:dark-base-900 dark:font-normal px-2"
    >
        <span
            >⭐ {{ $t("footer.support_laradumps") }},
            <a
                class="text-blue-500 underline cursor-pointer"
                @click="openLink('https://github.com/laradumps/laradumps')"
            >
                {{ $t("footer.star_out_repository") }}
            </a>
        </span>
    </div>
</template>
<script setup lang="ts">
import { defineProps } from "vue";

const openLink = (value) => {
    window.ipcRenderer.send("main:openLink", value);
};

defineProps({
    appVersion: {
        type: String,
        default: null
    }
});
</script>
