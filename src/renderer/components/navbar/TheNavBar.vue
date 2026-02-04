<script setup lang="ts">
import { defineProps, computed, onMounted, ref } from 'vue';
import NavBarAlwaysOnTop from '@/components/navbar/NavBarAlwaysOnTop.vue';
import NavBarGlobalSearch from '@/components/navbar/NavBarGlobalSearch.vue';
import NavBarProjectSwitcher from '@/components/navbar/NavBarProjectSwitcher.vue';
import NavBarPause from '@/components/navbar/NavBarPause.vue';
import NavBarCollapse from '@/components/navbar/NavBarCollapse.vue';
import NavBarSSH from '@/components/navbar/NavBarSSH.vue';
import NavBarSettings from '@/components/navbar/NavBarSettings.vue';
import NavBarSavedDumps from '@/components/navbar/NavBarSavedDumps.vue';
import NavBarUpdateAvailable from '@/components/navbar/NavBarUpdateAvailable.vue';
import { usePayloadStore } from '@/store/payload';
import ClearAll from '@/components/common/ClearAll.vue';
import { useSettingsStore } from '@/store/settings';
import { useLogStore } from '@/store/logs.js';
import { useJobStore } from '@/store/jobs.js';
import { useQueriesPayloadStore } from '@/store/queries.js';
import { useMailStore } from '@/store/mail.js';
import { useRouter } from 'vue-router';

const jobStore = useJobStore();
const queryStore = useQueriesPayloadStore();
const mailStore = useMailStore();
const settingsStore = useSettingsStore();
const logStore = useLogStore();
const router = useRouter();

const platform = ref('');
const isListeningModalOpen = ref(false);

const isDev = import.meta.env.MODE === 'development' || import.meta.env.DEV === true;

defineProps({
    inSavedDumpsWindow: {
        type: Boolean,
        default: false
    }
});

onMounted(() => {
    window.ipcRenderer.send('platform');
    window.ipcRenderer.on('platform.reply', (event, args) => {
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

const modalOpen = () => (isListeningModalOpen.value = true);
const modalClose = () => (isListeningModalOpen.value = false);
</script>

<template>
    <div
        class="flex text-base-content justify-between items-center px-2 text-center z-100 border-b border-base-content/10"
    >
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

        <div
            @click="modalClose"
            class="w-full select-none"
            :style="{
                '-webkit-app-region': isListeningModalOpen ? 'no-drag' : 'drag'
            }"
        >
            &nbsp;
        </div>

        <div class="flex gap-1 items-center m-0.5">
            <!-- global search -->
            <NavBarGlobalSearch v-if="hasPayload" />
            <!-- collapse -->
            <NavBarCollapse v-if="settingsStore.settings.show_collapse_button" />
            <!-- always on top -->
            <NavBarAlwaysOnTop />
            <!-- ssh -->
            <NavBarSSH v-if="settingsStore.settings.show_ssh_button" />

            <!-- MCP Indicator -->
            <div
                v-if="settingsStore.settings.mcp_enabled"
                class="flex items-center gap-1 mx-2 select-none cursor-pointer hover:bg-base-300 rounded px-1 transition-colors"
                title="MCP Server Active - Click to Configure"
                @click="router.push('/settings?tab=mcp')"
            >
                <span class="relative flex h-2 w-2">
                    <span class="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span class="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span class="text-[10px] uppercase font-bold text-base-content/70">MCP</span>
            </div>

            <!-- saved dumps -->
            <NavBarSavedDumps v-if="!inSavedDumpsWindow" />
            <!-- listening -->
            <NavBarProjectSwitcher
                v-if="!inSavedDumpsWindow"
                @modal-open="modalOpen"
                @modal-close="modalClose"
            />
            <!-- settings -->
            <NavBarSettings />
        </div>
    </div>
</template>
