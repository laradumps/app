<script setup lang="ts">
import TheNavBar from '@/components/navbar/TheNavBar.vue';
import { usePayloadStore } from '@/store/payload';
import { nextTick, onMounted, ref, watch } from 'vue';
import { useSettingsStore } from '@/store/settings';
import { useScreenStore } from '@/store/screen';
import { useLogStore } from '@/store/logs';
import { useJobStore } from '@/store/jobs';
import { useBrainStore } from '@/store/brains';
import { useQueriesPayloadStore } from '@/store/queries';
import { useCurrentProject } from '@/store/current-project';
import { useMailStore } from '@/store/mail';
import { useLivewireStore } from '@/store/livewire';
import { useMcpStore } from '@/store/mcp';
import { useClearAll } from '@/composables/useClearAll';
import JSConfetti from 'js-confetti';

import Toasters from '@/components/common/Toasters.vue';
import TheUpdateNotification from '@/components/app/TheUpdateNotification.vue';
import SettingsModal from '@/components/settings/SettingsModal.vue';
import NotificationWindow from '@/components/notification/NotificationWindow.vue';

const payloadStore = usePayloadStore();
const settingsStore = useSettingsStore();
const logStore = useLogStore();
const jobStore = useJobStore();
const brainStore = useBrainStore();
const queriesStore = useQueriesPayloadStore();
const currentProjectStore = useCurrentProject();
const mailStore = useMailStore();
const livewireStore = useLivewireStore();
const mcpStore = useMcpStore();

const { clear } = useClearAll();
const fireConfetti = () => new JSConfetti().addConfetti();

const exposeMcp = () => {
    if (settingsStore.settings.mcp_enabled) {
        window.LaraDumps = {
            logStore,
            jobStore,
            brainStore,
            queriesStore,
            settingsStore,
            payloadStore,
            currentProjectStore,
            mailStore,
            livewireStore,
            clearAll: () => clear(),
            confetti: () => fireConfetti()
        };
    } else {
        // @ts-ignore
        delete window.LaraDumps;
    }
};

watch(
    () => settingsStore.settings.mcp_enabled,
    () => {
        exposeMcp();
    }
);

const readyToLoad = ref(false);
const screen = ref<string | null>('');
const isNotification = ref(new URLSearchParams(window.location.search).get('notification') === '1');

//* * Convert shortcuts to Electron format **/
Object.defineProperty(String.prototype, 'beautifyShortcut', {
    value() {
        if (process.platform === 'darwin') {
            return this.replace(/CommandOrControl/g, '⌘')
                .replace(/Control/g, '⌃')
                .replace(/Shift/g, '⇧')
                .replace(/Alt/g, '⌥');
        }
        return this.replace(/CommandOrControl/g, 'Ctrl')
            .replace(/Control/g, 'Ctrl')
            .replace(/Shift/g, '⇧')
            .replace(/Alt/g, 'Alt');
    }
});

Object.defineProperty(String.prototype, 'toElectronFormat', {
    value() {
        return this.replace(/⌘/g, 'CommandOrControl')
            .replace(/⌃/g, 'Control')
            .replace(/⇧/g, 'Shift')
            .replace(/⌥/g, 'Alt');
    }
});

const getZoomLevel = (value: number): void => {
    let zoomFactor = value;

    window.webFrame.setZoomFactor(zoomFactor);

    document.querySelector('body').addEventListener(
        'mousewheel',
        (e) => {
            if (e.ctrlKey) {
                let value;
                e.preventDefault();

                value = e.deltaY > 0 ? (zoomFactor -= 0.1) : (zoomFactor += 0.1);

                window.ipcRenderer.send('main:update-zoom-level', value);

                window.webFrame.setZoomFactor(value);
            }
        },
        {
            passive: false
        }
    );
};

onMounted(() => {
    window.ipcRenderer.on('init.reply', async (e: any, args) => {
        settingsStore.settings = args.settings;
        readyToLoad.value = true;
        exposeMcp();
        settingsStore.applyWindowBlur(args.blurActive);
        window.ipcRenderer.send('settings.init-shortcuts');

        await nextTick();
        settingsStore.applyWindowBlur();
    });

    window.ipcRenderer.send('zoom-level');
    window.ipcRenderer.on('zoom-level.reply', (event, value) => getZoomLevel(value));

    window.ipcRenderer.on('mcp:log', (event, log: string) => {
        mcpStore.addLog(log);
    });

    window.ipcRenderer.invoke('mcp:get-logs-buffer').then((logs: string[]) => {
        logs.forEach((log) => {
            if (!mcpStore.logs.includes(log)) {
                mcpStore.addLog(log);
            }
        });
    });

    window.ipcRenderer.on('app:theme-dark', () => {
        settingsStore.settings.theme = 'dim';
        document.documentElement.setAttribute('data-theme', 'light');
        settingsStore.update();
    });

    window.ipcRenderer.on('app:theme-light', () => {
        settingsStore.settings.theme = 'light';
        document.documentElement.setAttribute('data-theme', 'light');
        settingsStore.update();
    });

    const urlParams = new URLSearchParams(window.location.search);
    screen.value = urlParams.get('screen');

    if (urlParams.has('blur')) {
        settingsStore.applyWindowBlur(true);
    }

    const style = document.createElement('style');
    style.innerHTML = settingsStore.settings.custom_css;
    document.head.appendChild(style);
});
</script>

<template>
    <div
        v-if="isNotification"
        :data-theme="settingsStore.settings.theme"
        class="bg-base-200 absolute w-full h-full min-h-full overflow-hidden"
    >
        <NotificationWindow />
    </div>

    <div
        v-else
        class="flex overflow-hidden flex-col flex-1 right-0 left-0 h-fill-available"
    >
        <div
            :data-theme="settingsStore.settings.theme"
            :class="{
                '!space-y-0': payloadStore.payload.length > 0
            }"
            class="bg-base-200 absolute w-full h-full min-h-full"
        >
            <div id="context-menu-portal"></div>

            <TheNavBar
                v-if="screen === 'default'"
                has-color
            />
            <div v-else>
                <div
                    class="flex text-base-content justify-between items-center px-2 text-center z-100 border-b border-base-content/10"
                >
                    <div class="w-full nav-bar">&nbsp;</div>
                    <span class="uppercase text-xs font-semibold nav-bar flex items-center">{{ screen }}</span>
                    <div class="w-full nav-bar">&nbsp;</div>
                </div>
            </div>

            <main class="w-full overflow-auto h-[calc(100vh-42px)]">
                <RouterView :key="$route.fullPath" />
                <Toasters />
                <TheUpdateNotification />
                <SettingsModal />
            </main>
        </div>
    </div>
</template>
