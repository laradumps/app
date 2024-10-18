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
            '!text-primary bg-base-200': isAlwaysOnTop
        }"
        class="px-1.5 py-2 hover:bg-base-200 text-base-content cursor-pointer rounded-md"
        @click="toggleAlwaysOnTop()"
    >
        <IconPin class="w-4" />
    </button>
</template>
