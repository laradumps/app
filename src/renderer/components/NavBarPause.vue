<script setup>
import { onMounted, ref } from "vue";
import IconPause from "@/components/Icons/IconPause.vue";
import IconPlay from "@/components/Icons/IconPlay.vue";

const isPaused = ref(false);

onMounted(() => {});

const togglePause = () => {
    isPaused.value = !isPaused.value;

    window.ipcRenderer.send("main:pause-dumps", isPaused.value);
};
</script>

<template>
    <button
        :title="$t('pause')"
        :class="{
            '!text-primary': isPaused
        }"
        class="p-2"
        @click="togglePause()"
    >
        <IconPause
            v-if="!isPaused"
            class="size-4 cursor-pointer text-content hover:opacity-75"
        />
        <IconPlay
            v-if="isPaused"
            class="size-4 cursor-pointer text-content hover:opacity-75"
        />
    </button>
</template>
