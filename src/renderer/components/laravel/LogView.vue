<script setup lang="ts">
import { computed, ref, watch, nextTick, onMounted, onUnmounted } from 'vue';
import moment from 'moment';
import { FunnelIcon, PlayIcon, TrashIcon, ClipboardDocumentIcon, CheckIcon, CogIcon } from '@heroicons/vue/24/outline';
import { ExclamationCircleIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/vue/24/outline';

import { Log, useLogStore } from '@/store/logs';
import CodeSnippet from '@/components/CodeSnippet.vue';
import { useColorStore } from '@/store/colors';
import SvgEmpty from '@/components/svg/SvgEmpty.vue';
import { useGlobalSearchStore } from '@/store/global-search';
import IconPause from '@/components/Icons/IconPause.vue';
import { usePauseLogsStore } from '@/store/pause-logs';
import DumpQuery from '@/components/laravel/DumpQuery.vue';
import { generateLink } from '@/utils/ideHandler';
import { copyLogToMarkdown } from '@/utils/logToMarkdown';
import { useSettingsStore } from '@/store/settings';
import { useCurrentProject } from '@/store/current-project';

const logStore = useLogStore();
const colorStore = useColorStore();
const globalSearchStore = useGlobalSearchStore();
const pauseLogsStore = usePauseLogsStore();
const settingsStore = useSettingsStore();
const currentProjectStore = useCurrentProject();

const forceUpdate = ref(0);
const expandedLogId = ref<string | null>(null);
const collapsedLogGroups = ref<Record<string, boolean>>({});
const levelFilter = ref<string[]>([]);
const copiedLogId = ref<string | null>(null);

const props = defineProps<{
    items: Record<string, Log>;
    inScreenWindow: boolean;
    yamlConfig?: Record<string, any>;
}>();

const totalLogs = computed(() => {
    const items = props.items ? props.items : logStore.logs;
    return Object.values(items).length;
});

const levelCounts = computed(() => {
    const items = props.items ? props.items : logStore.logs;
    return Object.values(items).reduce(
        (acc, log) => {
            acc[log.level] = (acc[log.level] || 0) + 1;
            return acc;
        },
        {} as Record<string, number>
    );
});

const logs = computed(() => {
    forceUpdate.value;

    const items = props.items ? props.items : logStore.logs;

    return Object.values(items)
        .filter((log: Log) => {
            if (colorStore.colors.length > 0) {
                return colorStore.colors.includes(colorStore.match(log.color));
            }
            return true;
        })
        .filter((log: Log) => {
            const searchTerm = globalSearchStore.search.toLowerCase();
            return (
                log.message.toLowerCase().includes(searchTerm) ||
                log.level.includes(searchTerm) ||
                log.context[0].includes(searchTerm)
            );
        })
        .filter((log: Log) => {
            return levelFilter.value.length === 0 || levelFilter.value.includes(log.level);
        })
        .sort((a, b) => {
            const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
            return dateB - dateA;
        });
});

watch(
    logs,
    (newLogs, oldLogs) => {
        if (newLogs.length > 0) {
            const newestLogId = newLogs[0].log_id;

            const shouldDisplayLast = settingsStore.settings?.display_last_log ?? true;
            if (shouldDisplayLast) {
                if (!oldLogs || oldLogs.length === 0 || (oldLogs.length > 0 && newestLogId !== oldLogs[0].log_id)) {
                    expandedLogId.value = newestLogId;
                }
            }
        }
    },
    { immediate: true }
);

watch(expandedLogId, (newId) => {
    if (newId === null) {
        return;
    }

    nextTick(() => {
        const findLog = logs.value.find((log) => log.log_id === newId);
        const sfDumpId = findLog.context[1];

        const sfDump = document.getElementById(`sf-dump-${sfDumpId}`);

        if (sfDump && !sfDump.hasAttribute('has-dump-js')) {
            sfDump.setAttribute('has-dump-js', 'true');
            window.Sfdump(`sf-dump-${sfDumpId}`);
        }
    });
});

const selectedLevel = (level: string) => {
    const index = levelFilter.value.indexOf(level);
    if (index > -1) {
        levelFilter.value.splice(index, 1);
    } else {
        levelFilter.value.push(level);
    }
};

const handleConfigChanged = (section: string, key: string, value: boolean) => {
    if (!props.yamlConfig || !currentProjectStore.projectInfo?.path) {
        console.warn('Cannot update YAML config: missing yamlConfig or project path');
        return;
    }

    const projectPath = currentProjectStore.projectInfo.path;

    window.ipcRenderer.send('storage.update-section', {
        path: projectPath,
        section: section,
        values: { [key]: value }
    });
};

const yamlObservers = computed(() => {
    const observers = props.yamlConfig?.observers;
    if (!observers || !observers.hasOwnProperty('logs')) return [];

    return [
        {
            key: 'logs',
            label: 'Enable Logs',
            enabled: observers.logs === true
        }
    ];
});

const yamlLogLevels = computed(() => {
    const logSection = props.yamlConfig?.logs;
    if (!logSection) return [];

    return Object.entries(logSection).map(([key, value]) => ({
        key: key,
        label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
        enabled: value === true
    }));
});

const toggleYamlControl = (section: string, key: string, currentValue: boolean) => {
    const newValue = !currentValue;
    handleConfigChanged(section, key, newValue);
};

const groupedLogsByRelativeTime = computed(() => {
    const groups: Record<string, Log[]> = {};
    for (const log of logs.value) {
        const timeKey = moment(log.created_at).fromNow();
        if (!groups[timeKey]) {
            groups[timeKey] = [];
        }
        groups[timeKey].push(log);
    }
    return groups;
});

const toggleLogGroup = (timeKey: string) => {
    collapsedLogGroups.value[timeKey] = !collapsedLogGroups.value[timeKey];
};

const toggleLogExpand = (logId: string) => {
    if (expandedLogId.value === logId) {
        expandedLogId.value = null;

        return;
    }

    expandedLogId.value = logId;
};

const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && expandedLogId.value) {
        expandedLogId.value = null;
        event.preventDefault();
    }
};

const copyToMarkdown = async (log: Log) => {
    try {
        await copyLogToMarkdown(log);
        copiedLogId.value = log.log_id;

        setTimeout(() => {
            copiedLogId.value = null;
        }, 2000);
    } catch (error) {
        console.error('Failed to copy:', error);
    }
};

onMounted(() => {
    window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown);
});

const clear = () => {
    if (pauseLogsStore.is_paused) {
        pauseLogsStore.toggle();
    }

    expandedLogId.value = null;
    logStore.clear();
};

const getBorderColor = (level: string) => {
    const colors: Record<string, string> = {
        error: 'border-error',
        critical: 'border-error',
        alert: 'border-error',
        emergency: 'border-error',
        warning: 'border-warning',
        notice: 'border-success',
        info: 'border-info',
        debug: 'border-gray-500'
    };
    return colors[level] || 'border-primary';
};

const canCopyToMarkdown = computed(() => {
    return (log: Log) => {
        const hasCode = log.code_snippet && log.code_snippet.length > 0;
        if (!hasCode) return false;

        const contextZero = log.context && log.context.length > 0 ? String(log.context[0]) : '';
        const emptySfDumpPattern = /<pre[^>]*>\s*\[\]\s*<\/pre>/i;
        const containsEmptySfDump = emptySfDumpPattern.test(contextZero);

        return !containsEmptySfDump;
    };
});

const displayLastLog = computed<boolean>({
    get: () => {
        return settingsStore.settings?.display_last_log ?? true;
    },
    set: (val: boolean) => {
        if (!settingsStore.settings) return;
        settingsStore.settings.display_last_log = val;
        settingsStore.update();
    }
});
</script>

<template>
    <div>
        <div>
            <!-- Actions Bar -->
            <div class="-mt-3 flex items-center justify-between w-full border-b border-base-content/10 h-9 px-3">
                <!-- Left: title + YAML cog -->
                <div class="flex items-center gap-2">
                    <span class="text-[10px] font-bold uppercase tracking-widest text-base-content/70 select-none"
                        >Logs</span
                    >

                    <!-- YAML Configuration Dropdown -->
                    <div class="dropdown dropdown-bottom dropdown-start">
                        <button
                            tabindex="0"
                            role="button"
                            class="btn btn-ghost btn-circle btn-xs"
                            :class="{
                                'text-primary':
                                    yamlObservers.some((control) => control.enabled) ||
                                    yamlLogLevels.some((control) => control.enabled)
                            }"
                            data-tippy-content="YAML Configuration"
                        >
                            <CogIcon class="w-4" />
                        </button>
                        <div
                            tabindex="0"
                            class="dropdown-content menu bg-base-300 rounded-xl border-0 z-[100] w-auto min-w-35 p-2 shadow-xl"
                        >
                            <div v-if="yamlLogLevels.length > 0">
                                <div class="menu-title mb-2">
                                    <span class="text-[9px] text-base-content/40 font-bold uppercase tracking-widest"
                                        >Levels to observe</span
                                    >
                                </div>
                                <div class="flex flex-col gap-1.5">
                                    <button
                                        v-for="control in yamlLogLevels"
                                        :key="control.key"
                                        @click="toggleYamlControl('logs', control.key, control.enabled)"
                                        class="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left"
                                        :class="
                                            control.enabled
                                                ? 'bg-base-content/10 text-base-content font-medium'
                                                : 'text-base-content/70 hover:bg-base-content/5 hover:text-base-content'
                                        "
                                    >
                                        <div class="size-2.5 rounded-full relative flex items-center justify-center">
                                            <span
                                                v-if="control.enabled"
                                                class="absolute inline-flex h-full w-full rounded-full bg-success opacity-20"
                                            ></span>
                                            <span
                                                class="relative inline-flex rounded-full size-2 transition-all duration-200"
                                                :class="
                                                    control.enabled
                                                        ? 'bg-success shadow-[0_0_6px_rgba(34,197,94,0.8)]'
                                                        : 'bg-base-content/20'
                                                "
                                            ></span>
                                        </div>
                                        <span class="truncate capitalize text-xs whitespace-nowrap">{{
                                            control.label
                                        }}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Right: actions -->
                <div class="flex items-center gap-1">
                    <!-- Display Last Toggle -->
                    <div class="flex items-center gap-1.5 px-1">
                        <label
                            for="toggle-display-last"
                            class="text-[10px] uppercase tracking-wider font-semibold opacity-40 select-none cursor-pointer"
                            >Display Last</label
                        >
                        <input
                            id="toggle-display-last"
                            type="checkbox"
                            class="toggle toggle-xs toggle-success"
                            v-model="displayLastLog"
                            data-tippy-content="Display last (auto-expand newest)"
                        />
                    </div>

                    <div class="w-px h-4 bg-base-content/10 mx-0.5"></div>

                    <!-- Filter Levels -->
                    <div class="dropdown dropdown-bottom dropdown-end">
                        <button
                            tabindex="0"
                            role="button"
                            class="btn btn-ghost btn-circle btn-sm"
                            data-tippy-content="Filter Levels"
                        >
                            <FunnelIcon
                                v-if="levelFilter.length === 0"
                                class="w-4"
                            />
                            <FunnelIcon
                                v-else
                                class="w-5 text-primary"
                            />
                        </button>
                        <ul
                            tabindex="0"
                            class="p-2 shadow-[0_10px_40px_rgba(0,0,0,0.5)] dropdown-content bg-base-200/95 backdrop-blur-xl rounded-xl border border-white/5 z-[100] w-52"
                        >
                            <li
                                v-for="level in [
                                    'debug',
                                    'info',
                                    'notice',
                                    'warning',
                                    'error',
                                    'critical',
                                    'alert',
                                    'emergency'
                                ]"
                                :key="level"
                                @click="selectedLevel(level)"
                            >
                                <a
                                    class="flex items-center justify-between px-3 py-2 rounded-lg transition-colors text-base-content/70 hover:bg-base-content/5 hover:text-base-content !text-xs"
                                    :class="{ 'text-primary': levelFilter.includes(level) }"
                                >
                                    <span class="capitalize">{{ level }}</span>
                                    <span class="text-base-content/40 text-[10px]">{{ levelCounts[level] || 0 }}</span>
                                </a>
                            </li>
                        </ul>
                    </div>

                    <!-- Pause -->
                    <button
                        @click="pauseLogsStore.toggle()"
                        class="btn btn-ghost btn-circle btn-sm"
                        :data-tippy-content="$t('pause')"
                    >
                        <PlayIcon
                            v-if="pauseLogsStore.is_paused"
                            class="w-4 text-warning"
                        />
                        <IconPause
                            v-else
                            class="w-4"
                        />
                    </button>

                    <!-- Clear -->
                    <button
                        v-if="totalLogs > 0"
                        @click="clear()"
                        class="btn btn-ghost btn-circle btn-sm text-error/70 hover:text-error"
                        data-tippy-content="Clear"
                    >
                        <TrashIcon class="w-4" />
                    </button>
                </div>
            </div>

            <div class="h-[calc(100vh-140px)]">
                <div
                    v-if="logs.length > 0"
                    class="overflow-auto px-3"
                    style="height: -webkit-fill-available"
                >
                    <!-- Header -->
                    <div
                        class="sticky top-0 z-10 bg-base-300 text-xs text-base-content grid grid-cols-[90px_1fr] gap-2 p-2"
                    >
                        <div>Level</div>
                        <div>Message</div>
                    </div>

                    <!-- Body -->
                    <div class="space-y-1">
                        <template
                            v-for="(logsOnTime, timeKey) in groupedLogsByRelativeTime"
                            :key="timeKey"
                        >
                            <!-- Time Group Header -->
                            <div
                                class="text-xs font-semibold text-center bg-base-200 py-2 transition-all duration-200"
                                :class="{
                                    'blur-sm opacity-40':
                                        expandedLogId !== null &&
                                        !logsOnTime.some((log) => log.log_id === expandedLogId)
                                }"
                            >
                                <span
                                    class="cursor-pointer link select-none"
                                    @click="toggleLogGroup(timeKey)"
                                >
                                    {{ timeKey }}
                                    <span class="ml-1">{{ collapsedLogGroups[timeKey] ? '▼' : '▲' }}</span>
                                </span>
                            </div>

                            <!-- Logs -->
                            <template v-if="!collapsedLogGroups[timeKey]">
                                <div
                                    v-for="(log, index) in logsOnTime"
                                    :key="`log-group-${log.log_id}`"
                                    :data-log-id="log.log_id"
                                    class="rounded-md overflow-hidden"
                                    :class="{
                                        'border-l-2': expandedLogId === log.log_id,
                                        [getBorderColor(log.level)]: expandedLogId === log.log_id,
                                        'blur-xs opacity-40': expandedLogId !== null && expandedLogId !== log.log_id
                                    }"
                                >
                                    <!-- Log Row -->
                                    <div
                                        class="grid grid-cols-[90px_1fr] border-l-2 border-base-100 gap-2 p-2 cursor-pointer hover:bg-base-100 transition-colors text-sm"
                                        :class="{
                                            'bg-base-100': expandedLogId === log.log_id
                                        }"
                                        @click="toggleLogExpand(log.log_id)"
                                    >
                                        <!-- Level Column -->
                                        <div class="flex items-center">
                                            <span
                                                class="badge text-xs !text-semibold badge-info p-1.5"
                                                v-if="log.level === 'info'"
                                                ><InformationCircleIcon class="w-5" /> Info</span
                                            >
                                            <span
                                                class="text-xs badge badge-success"
                                                v-else-if="log.level === 'notice'"
                                                ><InformationCircleIcon class="w-5" /> Notice</span
                                            >
                                            <span
                                                class="badge text-xs !text-semibold badge-warning p-1.5"
                                                v-else-if="log.level === 'warning'"
                                            >
                                                <ExclamationTriangleIcon class="w-5" />
                                                Warning
                                            </span>
                                            <span
                                                class="badge text-xs !text-semibold badge-error p-1.5"
                                                v-else-if="log.level === 'error'"
                                            >
                                                <ExclamationCircleIcon class="w-5" />Error</span
                                            >
                                            <span
                                                class="badge text-xs !text-semibold badge-error p-1.5"
                                                v-else-if="log.level === 'alert'"
                                            >
                                                <ExclamationCircleIcon class="w-5" />Alert</span
                                            >
                                            <span
                                                class="badge text-xs !text-semibold badge-error p-1.5"
                                                v-else-if="log.level === 'critical'"
                                            >
                                                <ExclamationTriangleIcon class="w-5" />Critical</span
                                            >
                                            <span
                                                class="badge text-xs !text-semibold badge-error p-1.5"
                                                v-else-if="log.level === 'emergency'"
                                                ><ExclamationCircleIcon class="w-5" />Emergency</span
                                            >
                                            <span
                                                class="badge text-xs !text-semibold bg-gray-500 text-primary-content p-1.5"
                                                v-else-if="log.level === 'debug'"
                                                ><InformationCircleIcon class="w-5" />Debug</span
                                            >
                                        </div>

                                        <!-- Message Column -->
                                        <div class="break-words space-y-1 min-w-0">
                                            <div class="line-clamp-2 overflow-hidden">{{ log.message }}</div>
                                            <div
                                                v-if="log.ide_handle.class_name !== 'empty'"
                                                class="truncate"
                                            >
                                                <a
                                                    :href="generateLink(log.ide_handle)"
                                                    v-text="`${log.ide_handle.class_name}:${log.ide_handle.line}`"
                                                    class="text-xs link opacity-60 inline-block"
                                                    @click.stop
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Expanded Content -->
                                    <div
                                        v-if="expandedLogId === log.log_id"
                                        class="bg-base-100 px-4 py-2"
                                    >
                                        <!-- Copy to Markdown Button -->
                                        <div
                                            v-if="canCopyToMarkdown(log)"
                                            class="flex justify-end mb-2"
                                        >
                                            <button
                                                @click.stop="copyToMarkdown(log)"
                                                class="btn btn-sm btn-soft gap-2"
                                                data-tippy-content="Copy to Markdown"
                                            >
                                                <CheckIcon
                                                    v-if="copiedLogId === log.log_id"
                                                    class="w-4 text-success"
                                                />
                                                <ClipboardDocumentIcon
                                                    v-else
                                                    class="w-4"
                                                />
                                                Copy to Markdown
                                            </button>
                                        </div>

                                        <!-- Stack Trace -->
                                        <div v-if="log.code_snippet && log.code_snippet.length > 0">
                                            <CodeSnippet
                                                :code_snippet="log.code_snippet"
                                                :ide_handle="log.ide_handle"
                                            />
                                        </div>

                                        <!-- Payload -->
                                        <div v-else-if="log.context && log.context.length > 0">
                                            <div class="px-1">
                                                <div v-html="log.context[0]"></div>
                                            </div>
                                        </div>

                                        <!-- Request -->
                                        <div
                                            v-if="log.requests && (log.requests.headers || log.requests.body)"
                                            class="mt-4 space-y-3"
                                        >
                                            <div class="space-y-2">
                                                <div>
                                                    <span class="font-semibold ml-1 text-sm">Request</span>
                                                </div>

                                                <!-- Headers -->
                                                <div
                                                    v-if="
                                                        log.requests.headers &&
                                                        Object.keys(log.requests.headers).length > 0
                                                    "
                                                >
                                                    <div>
                                                        <span class="font-semibold ml-1 text-xs">Headers</span>
                                                    </div>

                                                    <div
                                                        class="overflow-x-auto rounded-md border border-base-content/5 bg-base-200 mt-2"
                                                    >
                                                        <table class="table table-sm">
                                                            <tbody>
                                                                <tr
                                                                    v-for="(value, key) in log.requests.headers"
                                                                    :key="key"
                                                                >
                                                                    <th class="whitespace-nowrap">{{ key }}</th>
                                                                    <td class="break-all">
                                                                        <code
                                                                            class="overflow-y-hidden scrollbar-hidden max-h-32 overflow-x-scroll scrollbar-hidden-x"
                                                                            >{{ value }}</code
                                                                        >
                                                                    </td>
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>

                                                <!-- Body -->
                                                <div
                                                    v-if="log.requests.body"
                                                    class="mt-2"
                                                >
                                                    <div>
                                                        <span class="font-semibold ml-1 text-xs">Body</span>
                                                    </div>

                                                    <div
                                                        class="overflow-x-auto rounded-md border border-base-content/5 bg-base-200 mt-2"
                                                    >
                                                        <div class="flex items-center">
                                                            <span class="min-w-0 flex-grow">
                                                                <pre
                                                                    class="scrollbar-hidden mx-5 my-3 overflow-y-hidden text-xs lg:text-sm"
                                                                ><code class="overflow-y-hidden scrollbar-hidden overflow-x-scroll scrollbar-hidden-x">{{ log.requests.body }}</code></pre>
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Application -->
                                        <div
                                            v-if="
                                                log.requests && Object.keys(log.requests?.routeContext || {}).length > 0
                                            "
                                            class="mt-4 space-y-3"
                                        >
                                            <div class="space-y-2">
                                                <div>
                                                    <span class="font-semibold ml-1 text-sm">Routing</span>
                                                </div>

                                                <div
                                                    class="overflow-x-auto rounded-md border border-base-content/5 bg-base-200"
                                                >
                                                    <table class="table table-sm">
                                                        <tbody>
                                                            <tr v-if="log.requests.routeContext?.controller">
                                                                <th>Controller</th>
                                                                <td>{{ log.requests.routeContext.controller }}</td>
                                                            </tr>
                                                            <tr v-if="log.requests.routeContext?.middleware">
                                                                <th>Middleware</th>
                                                                <td>{{ log.requests.routeContext.middleware }}</td>
                                                            </tr>
                                                            <tr v-if="log.requests.routeContext?.routeName">
                                                                <th>Route name</th>
                                                                <td>{{ log.requests.routeContext.routeName }}</td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>

                                            <div
                                                v-if="log.queries && log.queries.length > 0"
                                                class="space-y-2"
                                            >
                                                <div>
                                                    <span class="font-semibold ml-1 text-sm">Queries</span>
                                                </div>

                                                <div
                                                    v-for="(query, queryIndex) in log.queries"
                                                    :key="queryIndex"
                                                    class="border border-base-content/5 rounded p-2 bg-base-200"
                                                >
                                                    <DumpQuery :query="query" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </template>
                        </template>
                    </div>
                </div>

                <div
                    v-else
                    class="-mt-[90px] -ml-8 absolute flex items-center justify-center w-full pointer-events-none"
                    style="height: -webkit-fill-available"
                >
                    <SvgEmpty class="opacity-25 w-30" />
                    <div class="text-base-content/70">
                        <h1 class="mb-2 text-lg font-semibold">Empty</h1>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
