<script setup lang="ts">
import { defineProps, computed, onMounted, ref } from "vue";
import NavBarAlwaysOnTop from "@/components/navbar/NavBarAlwaysOnTop.vue";
import NavBarGlobalSearch from "@/components/navbar/NavBarGlobalSearch.vue";
import NavBarProjectSwitcher from "@/components/navbar/NavBarProjectSwitcher.vue";
import NavBarPause from "@/components/navbar/NavBarPause.vue";
import NavBarCollapse from "@/components/navbar/NavBarCollapse.vue";
import NavBarSSH from "@/components/navbar/NavBarSSH.vue";
import NavBarSettings from "@/components/navbar/NavBarSettings.vue";
import NavBarSavedDumps from "@/components/navbar/NavBarSavedDumps.vue";
import NavBarUpdateAvailable from "@/components/navbar/NavBarUpdateAvailable.vue";
import { usePayloadStore } from "@/store/payload";
import ClearAll from "@/components/common/ClearAll.vue";
import { useSettingsStore } from "@/store/settings";
import { useLogStore } from "@/store/logs.js";
import { useJobStore } from "@/store/jobs.js";
import { useQueriesPayloadStore } from "@/store/queries.js";
import { useMailStore } from "@/store/mail.js";

const jobStore = useJobStore();
const queryStore = useQueriesPayloadStore();
const mailStore = useMailStore();
const settingsStore = useSettingsStore();
const logStore = useLogStore();

const platform = ref("");
const isDev = import.meta.env.MODE === 'development' || import.meta.env.DEV === true;

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

const hasPayload = computed(() => {
    return (
        payloadStore.payload.length > 0 ||
        Object.values(logStore.logs).length > 0 ||
        Object.values(jobStore.jobs).length > 0 ||
        Object.values(mailStore.mails).length > 0 ||
        Object.values(queryStore.payload).length > 0
    );
});
</script>

<template>
    <div class="flex text-base-content justify-between items-center px-2 text-center z-100 border-b border-base-content/10">
        <div :class="{ 'ml-[4.6rem]': platform === 'darwin' }">
            <div class="w-auto h-full">
                <div class="flex items-center gap-2">
                    <!-- update available -->
                    <NavBarUpdateAvailable v-if="!isDev && settingsStore.updateAvailable" />
                    <!-- clear -->
                    <ClearAll />
                    <!-- pause -->
                    <NavBarPause v-if="settingsStore.settings.show_pause_button" />
                </div>
            </div>
        </div>

        <div class="w-full select-none nav-bar">&nbsp;</div>

        <div class="flex gap-1 items-center m-0.5">
            <!-- global search -->
            <NavBarGlobalSearch v-if="hasPayload" />
            <!-- collapse -->
            <NavBarCollapse v-if="settingsStore.settings.show_collapse_button" />
            <!-- always on top -->
            <NavBarAlwaysOnTop />
            <!-- ssh -->
            <NavBarSSH v-if="settingsStore.settings.show_ssh_button" />
            <!-- saved dumps -->
            <NavBarSavedDumps v-if="!inSavedDumpsWindow" />
            <!-- listening -->
            <NavBarProjectSwitcher v-if="!inSavedDumpsWindow" />
            <!-- settings -->
            <NavBarSettings />
        </div>
    </div>
</template>
