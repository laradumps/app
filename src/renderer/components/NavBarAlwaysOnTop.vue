<template>
    <button
        :title="$t('always_on_top')"
        :class="{
            'bg-primary-200 shadow border border-primary-300 dark:border-primary-500 dark:bg-primary-800 dark:hover:border-primary-400': isAlwaysOnTop
        }"
        @click="toggleAlwaysOnTop()"
        class="rounded-full p-1.5"
    >
        <IconAlwaysOnTop />
    </button>
</template>

<script setup>
import { onMounted, ref } from "vue";
import IconAlwaysOnTop from "@/components/Icons/IconAlwaysOnTop.vue";

const isAlwaysOnTop = ref(false);

onMounted(() => {
    window.ipcRenderer.send("main:is-always-on-top");

    window.ipcRenderer.on("main:is-always-on-top", (event, arg) => {
        isAlwaysOnTop.value = arg.is_always_on_top;
    });

    window.ipcRenderer.on("app:local-shortcut-execute::alwaysOnTop", () => {
        toggleAlwaysOnTop();
    });
});
const toggleAlwaysOnTop = () => {
    isAlwaysOnTop.value = !isAlwaysOnTop.value;

    window.ipcRenderer.send("main:toggle-always-on-top", isAlwaysOnTop.value);
};
</script>
