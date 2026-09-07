<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useSettingsStore } from '@/store/settings';
import { CpuChipIcon } from '@heroicons/vue/24/outline';

const settingsStore = useSettingsStore();

const mcpStatus = ref<'connected' | 'error' | 'loading' | 'disabled'>('disabled');
const mcpMessage = ref('');

const statusIndicatorColor = computed(() => {
    switch (mcpStatus.value) {
        case 'connected':
            return 'bg-success';
        case 'error':
            return 'bg-error';
        case 'loading':
            return 'bg-warning';
        default:
            return 'bg-base-content/30';
    }
});

const statusIndicatorPulse = computed(() => {
    return mcpStatus.value === 'connected' || mcpStatus.value === 'loading';
});

const title = computed(() => {
    switch (mcpStatus.value) {
        case 'connected':
            return `MCP Server Connected - Port: ${settingsStore.settings.mcp_port || 3002}\nClick to configure`;
        case 'error':
            return `MCP Server Error: ${mcpMessage.value}\nClick to view logs`;
        case 'loading':
            return 'MCP Server initializing...';
        default:
            return 'MCP Server disabled - Click to enable';
    }
});

const onMcpLog = (_event: unknown, message: string) => {
    if (message.includes('[error]') || message.includes('Error') || message.includes('failed')) {
        mcpStatus.value = 'error';
        mcpMessage.value = message.split('] ')[1] || message;
    } else if (message.includes('running on')) {
        mcpStatus.value = 'connected';
        mcpMessage.value = '';
    }
};

const onMcpStatus = (_event: unknown, status: string) => {
    mcpStatus.value = status as 'connected' | 'error' | 'loading' | 'disabled';
};

const listenToMcpLogs = () => {
    window.ipcRenderer?.on('mcp:log', onMcpLog);
    window.ipcRenderer?.on('mcp:status', onMcpStatus);
};

const checkMcpStatus = () => {
    if (!settingsStore.settings.mcp_enabled) {
        mcpStatus.value = 'disabled';
        return;
    }

    mcpStatus.value = 'loading';
    window.ipcRenderer?.send('mcp:check-status');
};

let statusInterval: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
    listenToMcpLogs();
    checkMcpStatus();

    statusInterval = setInterval(checkMcpStatus, 30000);
});

onUnmounted(() => {
    if (statusInterval) {
        clearInterval(statusInterval);
        statusInterval = null;
    }
    window.ipcRenderer?.removeListener('mcp:log', onMcpLog);
    window.ipcRenderer?.removeListener('mcp:status', onMcpStatus);
});

const navigate = () => {
    const modal = document.getElementById('settings_modal') as HTMLDialogElement;
    modal?.showModal();
};
</script>

<template>
    <a
        v-if="settingsStore.settings.mcp_enabled"
        class="flex items-center justify-between gap-3 px-3 py-2 rounded-lg transition-colors text-base-content/70 cursor-default"
        :title="title"
    >
        <div class="flex items-center gap-3">
            <CpuChipIcon
                class="size-4"
                :class="{ 'text-error': mcpStatus === 'error', 'text-success': mcpStatus === 'connected' }"
            />
            <span class="font-medium text-xs">MCP Status</span>
        </div>
        <span class="relative flex h-2 w-2 mr-1">
            <span
                v-if="statusIndicatorPulse"
                :class="[
                    statusIndicatorColor,
                    'animate-pulse absolute inline-flex h-full w-full rounded-full opacity-75'
                ]"
            ></span>
            <span :class="[statusIndicatorColor, 'relative inline-flex rounded-full h-2 w-2']"></span>
        </span>
    </a>
</template>

<style scoped>
.animate-pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
    0%,
    100% {
        opacity: 0.75;
    }
    50% {
        opacity: 0.25;
    }
}
</style>
