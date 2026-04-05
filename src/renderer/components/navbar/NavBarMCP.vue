<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useSettingsStore } from '@/store/settings';
import { CpuChipIcon } from '@heroicons/vue/24/outline';

const router = useRouter();
const settingsStore = useSettingsStore();

const mcpStatus = ref<'connected' | 'error' | 'loading' | 'disabled'>('disabled');
const mcpMessage = ref('');

const statusIndicatorColor = computed(() => {
    switch (mcpStatus.value) {
        case 'connected':
            return 'bg-success shadow-[0_0_6px_rgba(0,255,0,0.8)]';
        case 'error':
            return 'bg-error shadow-[0_0_6px_rgba(255,0,0,0.8)]';
        case 'loading':
            return 'bg-warning shadow-[0_0_6px_rgba(255,165,0,0.8)]';
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

const listenToMcpLogs = () => {
    window.ipcRenderer?.on('mcp:log', (event, message) => {
        if (message.includes('[error]') || message.includes('Error') || message.includes('failed')) {
            mcpStatus.value = 'error';
            mcpMessage.value = message.split('] ')[1] || message;
        } else if (message.includes('running on')) {
            mcpStatus.value = 'connected';
            mcpMessage.value = '';
        }
    });

    window.ipcRenderer?.on('mcp:status', (event, status) => {
        mcpStatus.value = status as 'connected' | 'error' | 'loading' | 'disabled';
    });
};

const checkMcpStatus = () => {
    if (!settingsStore.settings.mcp_enabled) {
        mcpStatus.value = 'disabled';
        return;
    }

    mcpStatus.value = 'loading';
    window.ipcRenderer?.send('mcp:check-status');
};

onMounted(() => {
    listenToMcpLogs();
    checkMcpStatus();

    const interval = setInterval(checkMcpStatus, 30000);
    return () => clearInterval(interval);
});

const navigate = () => {
    if (mcpStatus.value === 'error') {
        router.push('/settings?tab=logs');
    } else {
        router.push('/settings?tab=mcp');
    }
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
