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
    nextTick(() => {
        // store
        payloadStore.clearAll();
        timeStore.clear();
        globalSearchStore.clear();
        colorStore.clear();
        payloadStore.clearAll();

        // screenStore
        screenStore.clearAll();
        screenStore.activeScreen("home");
        screenStore.add({
            screen_name: "home",
            visible: true,
            pinned: false,
            raise_in: 0,
            new_window: false
        });
        window.ipcRenderer.send("reload");
    });
};

onMounted(() => {
    window.ipcRenderer.on("clear", () => clearAll());
    window.ipcRenderer.on("app:local-shortcut-execute::clearAll", () => clearAll());
});
</script>

<template>
    <div>
        <a
            v-show="payloadStore.payload.length > 0"
            :title="$t('menu.clear')"
            class="w-[32px] tab px-1.5 py-2 hover:bg-base-200 text-base-content cursor-pointer transition-all duration-100 ease-in rounded-md"
            @click="clearAll"
        >
            <TrashIcon class="size-4" />
        </a>
    </div>
</template>

<style scoped></style>
