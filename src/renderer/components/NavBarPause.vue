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
    <div class="flex gap-3 items-center">
        <button
            :title="$t('pause')"
            class="p-2 hover:bg-base-200 rounded-md"
            @click="togglePause()"
        >
            <IconPause v-if="!isPaused" />
            <IconPlay
                v-else
                class="size-4 text-warning"
            />
        </button>
    </div>
</template>
