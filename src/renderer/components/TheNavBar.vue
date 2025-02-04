<script setup>
import { defineProps, defineEmits, computed, onMounted, ref } from "vue";
import { TrashIcon } from "@heroicons/vue/24/outline";
import NavBarAlwaysOnTop from "@/components/NavBarAlwaysOnTop.vue";
import NavBarGlobalSearch from "@/components/NavBarGlobalSearch.vue";
import NavBarListening from "@/components/NavBarListening.vue";
import NavBarPause from "@/components/NavBarPause.vue";
import NavBarCollapse from "@/components/NavBarCollapse.vue";
import NavBarSSH from "@/components/NavBarSSH.vue";
import NavBarSettings from "@/components/NavBarSettings.vue";
import { usePayloadStore } from "@/store/payload";
import ClearAll from "@/components/ClearAll.vue";
import HeaderColorsFilter from "@/components/HeaderColorsFilter.vue";

const platform = ref("");
defineProps({
    inSavedDumpsWindow: {
        type: Boolean,
        default: false
    }
});

onMounted(() => {
    window.ipcRenderer.send("platform");
    window.ipcRenderer.on("platform.reply", (event, args) => {
        platform.value = args;
    });
});

const payloadStore = usePayloadStore();

const hasColor = computed(() => {
    return payloadStore.payload.filter((payload) => payload.hasOwnProperty("color")).length > 0;
});
</script>

<template>
    <div class="flex text-base-content justify-between items-center px-2 text-center z-100 border-b border-base-content/10">
        <div
            v-if="payloadStore.payload.length > 0"
            :class="{ 'ml-8': platform === 'darwin' }"
        >
            <div class="w-auto h-full">
                <div class="flex gap-1 items-center">
                    <!-- clear -->
                    <ClearAll />

                    <!-- pause -->
                    <NavBarPause />
                </div>
            </div>
        </div>

        <div class="w-full nav-bar">&nbsp;</div>

        <HeaderColorsFilter v-bind:has-color="hasColor" />

        <div class="w-full nav-bar">&nbsp;</div>

        <div class="flex gap-1 items-center m-0.5">
            <!-- global search -->
            <NavBarGlobalSearch v-if="payloadStore.payload.length > 0" />

            <!-- collapse -->
            <NavBarCollapse v-if="payloadStore.payload.length > 0" />

            <!-- always on top -->
            <NavBarAlwaysOnTop />

            <!-- ssh -->
            <NavBarSSH />

            <!-- listening -->
            <NavBarListening v-if="!inSavedDumpsWindow" />

            <!-- always on top -->
            <NavBarSettings />
        </div>
    </div>
</template>
