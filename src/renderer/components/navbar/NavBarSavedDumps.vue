<script setup>
import { computed, watch } from "vue";
import { useSavedDumpsStore } from "@/store/saved-dumps";
import { deepClone } from "@/lib/deep_clone";
import { BookmarkIcon } from "@heroicons/vue/24/outline";

const savedStore = useSavedDumpsStore();

const hasSaved = computed(() => savedStore.count > 0);

const openSavedWindow = () => {
    if (!hasSaved.value) return;

    const payload = deepClone(savedStore.all);

    window.ipcRenderer.send("screen-window:show", {
        screen: "saved",
        payload,
        position: {}
    });
};

watch(
    () => savedStore.count,
    () => {
        const payload = deepClone(savedStore.all);
        window.ipcRenderer.send("send-screen-window-update", {
            screen: "saved",
            payload
        });
    }
);
</script>

<template>
    <button
        v-if="hasSaved"
        :title="$t('menu.saved_dumps')"
        class="p-2 flex hover:bg-base-200 rounded-md"
        @click="openSavedWindow"
    >
        <BookmarkIcon class="size-4" />
    </button>
</template>
