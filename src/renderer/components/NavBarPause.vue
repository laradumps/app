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
            class="p-2 hover:bg-base-200 text-base-content cursor-pointer rounded-md"
            @click="togglePause()"
        >
            <IconPause
                v-if="!isPaused"
                class="size-4"
            />
            <IconPlay
                v-else
                class="size-4 text-warning"
            />
        </button>

        <span
            v-if="isPaused"
            class="badge badge-warning badge-sm whitespace-nowrap"
        >
            {{ $t("is_paused") }}</span
        >
    </div>
</template>
