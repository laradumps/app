<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { useXDebug } from '@/store/xdebug';
import { BugAntIcon } from '@heroicons/vue/24/outline';
import { BugAntIcon as BugAntSolid } from '@heroicons/vue/24/solid';
import { useCurrentProject } from '@/store/current-project';
import { XDebugYml } from '@/types/XDebug';
import { IpcRendererEvent } from 'electron';

const xDebugStore = useXDebug();
const currentProjectStore = useCurrentProject();
const isXdebugActive = ref(false);

const IPC_EVENTS = {
    MAIN_SETTING_GET_XDEBUG_ENVS: 'main:setting-get-xdebug-environments',
    CONNECT_XDEBUG: 'connect-xdebug',
    DISCONNECT_XDEBUG: 'disconnect-xdebug',
    SETTINGS_ENV_XDEBUG_FILE_CONTENTS: 'settings:env-xdebug-file-contents',
    XDEBUG_ERROR: 'xdebug-error',
    XDEBUG_CONNECTOR_DISCONNECT: 'xdebug-connector::disconnect',
    XDEBUG_CONNECT_CLOSED: 'xdebug-connect-closed'
} as const;

let handleXdebugClosedRef: (() => void) | null = null;
let handleXdebugFileContentsRef: ((event: Event, config: XDebugYml) => void) | null = null;
const onXdebugError = (_: IpcRendererEvent, error: Error) => console.error('Xdebug error:', error);
const disconnectFromXdebug = () => window.ipcRenderer.send(IPC_EVENTS.DISCONNECT_XDEBUG);
const connectToXdebug = () => {
    if (currentProjectStore.projectInfo?.path) {
        window.ipcRenderer.send(IPC_EVENTS.MAIN_SETTING_GET_XDEBUG_ENVS, currentProjectStore.projectInfo.path);
    }
};

watch(isXdebugActive, (active) => {
    if (active) {
        connectToXdebug();
    } else {
        disconnectFromXdebug();
    }
});

watch(xDebugStore, (store) => {
    isXdebugActive.value = Boolean(store.current.project_path);
});

onMounted(() => {
    isXdebugActive.value = Boolean(xDebugStore.current.project_path);

    window.ipcRenderer.on(IPC_EVENTS.XDEBUG_ERROR, onXdebugError);
    window.ipcRenderer.on(IPC_EVENTS.XDEBUG_CONNECTOR_DISCONNECT, disconnectFromXdebug);

    handleXdebugClosedRef = () => setTimeout(() => (isXdebugActive.value = false), 800);
    window.ipcRenderer.on(IPC_EVENTS.XDEBUG_CONNECT_CLOSED, handleXdebugClosedRef);

    handleXdebugFileContentsRef = (_: Event, config: XDebugYml) => {
        xDebugStore.setCurrent(config);
        window.ipcRenderer.send(IPC_EVENTS.CONNECT_XDEBUG, config);
    };
    window.ipcRenderer.on(IPC_EVENTS.SETTINGS_ENV_XDEBUG_FILE_CONTENTS, handleXdebugFileContentsRef);
});

onUnmounted(() => {
    window.ipcRenderer.off(IPC_EVENTS.XDEBUG_ERROR, onXdebugError);
    window.ipcRenderer.off(IPC_EVENTS.XDEBUG_CONNECTOR_DISCONNECT, disconnectFromXdebug);
    if (handleXdebugClosedRef) {
        window.ipcRenderer.off(IPC_EVENTS.XDEBUG_CONNECT_CLOSED, handleXdebugClosedRef);
    }
    if (handleXdebugFileContentsRef) {
        window.ipcRenderer.off(IPC_EVENTS.SETTINGS_ENV_XDEBUG_FILE_CONTENTS, handleXdebugFileContentsRef);
    }
});
</script>

<template>
    <a
        class="flex items-center justify-between gap-3 px-3 py-2 rounded-lg transition-colors cursor-pointer text-base-content/70 hover:bg-base-content/5 hover:text-base-content"
        @click.stop="isXdebugActive = !isXdebugActive"
        :title="isXdebugActive ? 'Disable Xdebug' : 'Enable Xdebug'"
    >
        <div class="flex items-center gap-3">
            <BugAntIcon
                class="size-4"
                :class="{ 'text-success': isXdebugActive }"
            />
            <span class="font-medium text-xs">Xdebug</span>
        </div>
        <input
            type="checkbox"
            class="toggle toggle-success toggle-xs pointer-events-none"
            :checked="isXdebugActive"
        />
    </a>
</template>
