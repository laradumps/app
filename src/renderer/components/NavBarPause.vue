<script setup>
import { onMounted, ref } from "vue";
import IconPause from "@/components/Icons/IconPause.vue";
import IconPlay from "@/components/Icons/IconPlay.vue";

const isPaused = ref(false);

onMounted(() => {});

defineProps({
    isSavedDumpsWindow: {
        type: Boolean,
        required: false
    }
});

const togglePause = () => {
    isPaused.value = !isPaused.value;

    window.ipcRenderer.send("main:pause-dumps", isPaused.value);
};
</script>

<template>
    <button
        v-if="!isSavedDumpsWindow"
        :title="$t('pause')"
        class="w-[32px] !h-[34px] tab p-1.5 py-2 hover:bg-base-200 text-base-content cursor-pointer rounded-md"
        @click="togglePause()"
    >
        <IconPause
            v-if="!isPaused"
            class="size-4"
        />
        <IconPlay
            v-else
            class="size-4 text-primary"
        />
    </button>
</template>
