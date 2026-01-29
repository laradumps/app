<script setup lang="ts">
import TheNavBar from '@/components/navbar/TheNavBar.vue';
import { usePayloadStore } from '@/store/payload';
import { onMounted, ref, watch } from 'vue';
import { useSettingsStore } from '@/store/settings';
import { useScreenStore } from '@/store/screen';
import { useLogStore } from '@/store/logs';
import { useJobStore } from '@/store/jobs';
import { useBrainStore } from '@/store/brains';
import { useQueriesPayloadStore } from '@/store/queries';
import { useCurrentProject } from '@/store/current-project';
import { useMailStore } from '@/store/mail';
import { useLivewireStore } from '@/store/livewire';

import Toasters from '@/components/common/Toasters.vue';
import TheAppUpdateInfo from '@/components/app/TheAppUpdateInfo.vue';

const payloadStore = usePayloadStore();
const settingsStore = useSettingsStore();
const screenStore = useScreenStore();
const logStore = useLogStore();
const jobStore = useJobStore();
const brainStore = useBrainStore();
const queriesStore = useQueriesPayloadStore();
const currentProjectStore = useCurrentProject();
const mailStore = useMailStore();
const livewireStore = useLivewireStore();

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
            livewireStore
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

//* * Convert shortcuts to Electron format **/
Object.defineProperty(String.prototype, 'beautifyShortcut', {
    value() {
        if (process.platform === 'darwin') {
            return this.replace(/CommandOrControl/g, '⌘')
                .replace(/Shift/g, '⇧')
                .replace(/Option|Alt/g, '⌥');
        }
        return this.replace(/CommandOrControl/g, 'Ctrl')
            .replace(/Shift/g, '⇧')
            .replace(/Option|Alt/g, 'Alt');
    }
});

Object.defineProperty(String.prototype, 'toElectronFormat', {
    value() {
        return this.replace(/|⌃|⌘|Ctrl/g, 'CommandOrControl')
            .replace(/⇧|Shift/g, 'Shift')
            .replace(/⌥|Alt/g, 'Option');
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
        window.ipcRenderer.send('settings.init-shortcuts');
    });

    window.ipcRenderer.send('zoom-level');
    window.ipcRenderer.on('zoom-level.reply', (event, value) => getZoomLevel(value));

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

    const style = document.createElement('style');
    style.innerHTML = settingsStore.settings.custom_css;
    document.head.appendChild(style);
});
</script>

<template>
    <div class="flex overflow-hidden flex-col flex-1 right-0 left-0 h-fill-available">
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
                <div
                    id="actions"
                    :class="{
                        '!right-2': screenStore.screen === 'queries'
                    }"
                    class="flex absolute right-[44px] z-[70] top-[47px] gap-1 items-center p-0.5 px-1"
                ></div>

                <RouterView :key="$route.fullPath" />
                <Toasters />
                <TheAppUpdateInfo />
            </main>
        </div>
    </div>
</template>
