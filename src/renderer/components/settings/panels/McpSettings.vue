<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useSettingsStore } from '@/store/settings';
import { useMcpStore } from '@/store/mcp';
import { useToastStore } from '@/store/toast';
import { useSettingsSave } from '@/composables/useSettingsSave';
import McpToolsTable from './McpToolsTable.vue';

const settingsStore = useSettingsStore();
const mcpStore = useMcpStore();
const toast = useToastStore();
const { save } = useSettingsSave();

const mcpServerPath = ref('');
const mcpClient = ref<'cursor' | 'claude' | 'opencode'>('cursor');
const activeTab = ref<'setup' | 'tools'>('setup');

const tools = [
    { name: 'get_logs', description: 'Get all logs' },
    { name: 'get_log_details', description: 'Get full details of a specific log by ID' },
    { name: 'get_queries', description: 'Get SQL queries' },
    { name: 'get_jobs', description: 'Get jobs' },
    { name: 'get_brains', description: "Get collected 'Brains' data" },
    { name: 'get_dumps', description: 'Get all dumps' },
    { name: 'get_project_info', description: 'Get current project information' },
    { name: 'get_mails', description: 'List captured emails (metadata only)' },
    {
        name: 'get_mail',
        description: 'Get a single email by message_id, with selectable parts (text/html/attachments/...)'
    },
    { name: 'get_livewire_components', description: 'Get all Livewire components' },
    { name: 'search_dumps', description: 'Search across all dumps, queries, logs, and mails' },
    { name: 'analyze_last_exception', description: 'Analyze the most recent exception or error log (Prompt)' },
    { name: 'summarize_logs', description: 'Summarize the recent application logs (Prompt)' },
    { name: 'optimize_latest_query', description: 'Analyze and optimize the latest SQL query (Prompt)' }
];

const actions = [
    { name: 'clear_dumps', description: 'Clears all dumps' },
    { name: 'clear_jobs', description: 'Clears all jobs' },
    { name: 'clear_mails', description: 'Clears all emails' },
    { name: 'clear_logs', description: 'Clears all logs' },
    { name: 'confetti', description: 'Fires a confetti animation on the main application screen' },
    { name: 'toggle_env', description: 'Enable, disable or toggle a environment/watcher for the current project.' }
];

onMounted(async () => {
    mcpServerPath.value = await window.ipcRenderer.invoke('get-mcp-server-path');
});

const stdioCommand = () => `node ${mcpServerPath.value} --port=${settingsStore.settings.mcp_port}`;

const saveMcpSettings = async () => {
    await save();
    window.ipcRenderer.send('mcp:restart');
};

const copyMcpCommand = (command: string) => {
    navigator.clipboard.writeText(command);
    toast.show('Command copied to clipboard', 'success');
};

const copyMcpConfig = () => {
    const port = settingsStore.settings.mcp_port;
    let config: unknown;

    if (mcpClient.value === 'cursor') {
        config = { mcpServers: { laradumps: { url: `http://127.0.0.1:${port}/mcp` } } };
    } else if (mcpClient.value === 'opencode') {
        config = {
            $schema: 'https://opencode.ai/config.json',
            mcp: { LaraDumps: { type: 'remote', url: `http://127.0.0.1:${port}/mcp` } }
        };
    } else {
        config = `claude mcp add laradumps http://127.0.0.1:${port}/mcp --transport http`;
    }

    navigator.clipboard.writeText(typeof config === 'string' ? config : JSON.stringify(config, null, 2));
    toast.show(
        mcpClient.value === 'claude' ? 'CLI command copied to clipboard' : 'Configuration JSON copied to clipboard',
        'success'
    );
};
</script>

<template>
    <div class="flex flex-col gap-3">
        <div
            role="tablist"
            class="tabs tabs-box bg-base-200/50 !px-0"
        >
            <input
                type="radio"
                name="mcp_tabs"
                class="tab"
                aria-label="Setup"
                :checked="activeTab === 'setup'"
                @click="activeTab = 'setup'"
            />
            <input
                type="radio"
                name="mcp_tabs"
                class="tab"
                aria-label="Tools"
                :checked="activeTab === 'tools'"
                @click="activeTab = 'tools'"
            />
        </div>

        <!-- Setup -->
        <div
            v-if="activeTab === 'setup'"
            class="flex flex-col gap-2"
        >
            <div class="grid grid-cols-2 gap-3">
                <fieldset class="fieldset">
                    <legend class="fieldset-legend">Port</legend>
                    <input
                        type="number"
                        class="input input-sm w-full"
                        v-model="settingsStore.settings.mcp_port"
                        @change="saveMcpSettings"
                        placeholder="3002"
                    />
                </fieldset>

                <fieldset class="fieldset">
                    <legend class="fieldset-legend">Limit Payload objects</legend>
                    <div
                        class="tooltip w-full"
                        data-tip="Max number of items returned to AI (logs, queries, etc)"
                    >
                        <input
                            type="number"
                            class="input input-sm w-full"
                            v-model="settingsStore.settings.mcp_limit_payload_objects"
                            @change="saveMcpSettings"
                            placeholder="10"
                        />
                    </div>
                </fieldset>
            </div>

            <div class="divider my-1">Modes</div>

            <!-- Native Mode -->
            <div class="flex flex-col gap-2 p-3 bg-base-100 border border-base-300 rounded-box relative">
                <div class="flex justify-between items-center">
                    <h4 class="font-bold text-sm">Native (Streamable HTTP)</h4>
                    <input
                        type="checkbox"
                        class="toggle toggle-primary"
                        v-model="settingsStore.settings.mcp_enabled"
                        @change="saveMcpSettings"
                    />
                </div>

                <div
                    v-if="settingsStore.settings.mcp_enabled"
                    class="mt-2 space-y-3"
                >
                    <div class="tabs tabs-box bg-base-200/50">
                        <input
                            type="radio"
                            name="mcp_conf_tabs"
                            class="tab tab-sm"
                            aria-label="Cursor"
                            :checked="mcpClient === 'cursor'"
                            @click="mcpClient = 'cursor'"
                        />
                        <input
                            type="radio"
                            name="mcp_conf_tabs"
                            class="tab tab-sm"
                            aria-label="Claude Code (CLI)"
                            :checked="mcpClient === 'claude'"
                            @click="mcpClient = 'claude'"
                        />
                        <input
                            type="radio"
                            name="mcp_conf_tabs"
                            class="tab tab-sm"
                            aria-label="OpenCode"
                            :checked="mcpClient === 'opencode'"
                            @click="mcpClient = 'opencode'"
                        />
                    </div>

                    <div class="mockup-code w-full shadow-sm bg-base-300 text-[11px]">
                        <pre v-if="mcpClient === 'cursor'"><code>{
  "mcpServers": {
    "LaraDumps": {
       "url": "http://127.0.0.1:{{ settingsStore.settings.mcp_port }}/mcp"
    }
  }
}</code></pre>
                        <pre
                            v-if="mcpClient === 'claude'"
                        ><code>claude mcp add laradumps http://127.0.0.1:{{ settingsStore.settings.mcp_port }}/mcp --transport http</code></pre>
                        <pre v-if="mcpClient === 'opencode'"><code>{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "LaraDumps": {
       "type": "remote",
       "url": "http://127.0.0.1:{{ settingsStore.settings.mcp_port }}/mcp"
    }
  }
}</code></pre>
                        <button
                            class="btn btn-xs btn-ghost absolute top-2 right-2"
                            @click="copyMcpConfig"
                        >
                            {{ mcpClient === 'claude' ? 'Copy Command' : 'Copy JSON' }}
                        </button>
                    </div>
                </div>
            </div>

            <!-- Stdio Mode -->
            <div class="flex flex-col gap-2 p-3 bg-base-100 border border-base-300 rounded-box">
                <h4 class="font-bold text-sm">Stdio Command</h4>
                <div class="join w-full mt-1">
                    <input
                        type="text"
                        class="input input-sm join-item w-full font-mono bg-base-200 text-[11px]"
                        :value="stdioCommand()"
                        readonly
                    />
                    <button
                        class="btn btn-sm btn-neutral join-item"
                        @click="copyMcpCommand(stdioCommand())"
                    >
                        Copy
                    </button>
                </div>
            </div>

            <!-- Server Logs -->
            <div class="flex flex-col gap-2 mt-2">
                <div class="flex justify-between items-center px-1">
                    <h4 class="font-bold text-sm">Server Logs</h4>
                    <span
                        v-if="mcpStore.logs.length > 0"
                        class="text-[10px] opacity-50"
                        >Showing last {{ mcpStore.logs.length }} logs (newest first)</span
                    >
                </div>
                <div
                    class="mockup-code bg-base-300 w-full text-[11px] shadow-sm max-h-60 overflow-y-auto overflow-x-hidden"
                >
                    <pre
                        v-for="(log, index) in [...mcpStore.logs].reverse()"
                        :key="index"
                        :class="{
                            'text-error': log.includes('[error]'),
                            'text-success': log.includes('[success]'),
                            'text-info': log.includes('[info]')
                        }"
                        class="whitespace-pre-wrap break-all"
                    ><code>{{ log }}</code></pre>
                    <pre
                        v-if="mcpStore.logs.length === 0"
                        class="opacity-50"
                    ><code>Waiting for logs...</code></pre>
                </div>
            </div>
        </div>

        <!-- Tools -->
        <div
            v-if="activeTab === 'tools'"
            class="flex flex-col gap-3"
        >
            <McpToolsTable
                title="Data Retrieval & Analysis"
                name-header="Tool Name"
                :rows="tools"
            />
            <McpToolsTable
                title="Actions"
                name-header="Action Name"
                :rows="actions"
            />
        </div>
    </div>
</template>
