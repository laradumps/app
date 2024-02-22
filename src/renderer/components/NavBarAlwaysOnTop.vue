<template>
    <button
        :title="$t('always_on_top')"
        :class="{
            '!text-primary': isAlwaysOnTop
        }"
        @click="toggleAlwaysOnTop()"
    >
        <IconPin class="w-3 cursor-pointer text-content hover:text-neutral" />
    </button>
</template>

<script setup>
import { onMounted, ref } from "vue";
import IconPin from "@/components/Icons/IconPin.vue";

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
