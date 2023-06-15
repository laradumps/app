<template>
    <button
        :title="$t('always_on_top')"
        :class="{
            'bg-slate-200 shadow border border-slate-300 dark:border-slate-500 dark:bg-slate-800 dark:hover:border-slate-400': isAlwaysOnTop
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

    window.ipcRenderer.on("app:global-shortcut-execute::alwaysOnTop", () => {
        toggleAlwaysOnTop();
    });
});
const toggleAlwaysOnTop = () => {
    isAlwaysOnTop.value = !isAlwaysOnTop.value;

    window.ipcRenderer.send("main:toggle-always-on-top", isAlwaysOnTop.value);
};
</script>
