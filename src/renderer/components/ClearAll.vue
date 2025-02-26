<script setup lang="ts">
import { nextTick, onMounted } from "vue";
import { useScreenStore } from "@/store/screen";
import { useTimeStore } from "@/store/time";
import { useColorStore } from "@/store/colors";
import { useGlobalSearchStore } from "@/store/global-search";
import { usePayloadStore } from "@/store/payload";
import { TrashIcon } from "@heroicons/vue/24/outline";

const screenStore = useScreenStore();
const timeStore = useTimeStore();
const colorStore = useColorStore();
const globalSearchStore = useGlobalSearchStore();
const payloadStore = usePayloadStore();

const clearAll = (): void => {
    // store
    payloadStore.clearAll();
    timeStore.clear();
    globalSearchStore.clear();
    colorStore.clear();
    payloadStore.clearAll();
};

onMounted(() => {
    window.ipcRenderer.on("clear", () => clearAll());
    window.ipcRenderer.on("app:local-shortcut-execute::clear_all", () => clearAll());
});
</script>

<template>
    <div>
        <button
            v-show="payloadStore.payload.length > 0"
            :title="$t('clear')"
            class="p-2 flex hover:bg-base-200 rounded-md"
            @click="clearAll"
        >
            <TrashIcon class="size-4" />
        </button>
    </div>
</template>

<style scoped></style>
