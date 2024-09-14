<script setup>
import { onMounted, ref } from "vue";
import IconPin from "@/components/Icons/IconPin.vue";

const isAlwaysOnTop = ref(false);

const props = defineProps({
    window: {
        type: String,
        required: false,
        default: "main"
    }
});

onMounted(() => {
    window.ipcRenderer.send(props.window + ":is-always-on-top");

    window.ipcRenderer.on(props.window + ":is-always-on-top", (event, arg) => {
        isAlwaysOnTop.value = arg.is_always_on_top;
    });

    window.ipcRenderer.on("app:local-shortcut-execute::alwaysOnTop", () => {
        toggleAlwaysOnTop();
    });
});

const toggleAlwaysOnTop = () => {
    isAlwaysOnTop.value = !isAlwaysOnTop.value;

    window.ipcRenderer.send(props.window + ":toggle-always-on-top", isAlwaysOnTop.value);
};
</script>

<template>
    <button
        :title="$t('always_on_top')"
        :class="{
            '!text-primary': isAlwaysOnTop
        }"
        class="p-2"
        @click="toggleAlwaysOnTop()"
    >
        <IconPin class="w-3.5 cursor-pointer text-content hover:opacity-75" />
    </button>
</template>
