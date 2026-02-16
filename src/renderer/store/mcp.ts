import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useMcpStore = defineStore('mcp', () => {
    const logs = ref<string[]>([]);

    const addLog = (log: string) => {
        logs.value.push(log);
        if (logs.value.length > 100) {
            logs.value.shift();
        }
    };

    const clearLogs = () => {
        logs.value = [];
    };

    return {
        logs,
        addLog,
        clearLogs
    };
});
