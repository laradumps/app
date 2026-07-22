<script setup lang="ts">
import { computed, ref, watch, nextTick, onMounted, onUnmounted } from 'vue';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);
import {
    FunnelIcon,
    TrashIcon,
    ClipboardDocumentIcon,
    CheckIcon,
    FolderOpenIcon,
    ExclamationTriangleIcon,
    DocumentMinusIcon,
    ChevronDownIcon,
    DocumentTextIcon,
    ArrowPathIcon
} from '@heroicons/vue/24/outline';

import { Log } from '@/store/logs';
import CodeSnippet from '@/components/CodeSnippet.vue';
import { useColorStore } from '@/store/colors';
import SvgEmpty from '@/components/svg/SvgEmpty.vue';
import { useGlobalSearchStore } from '@/store/global-search';
import { useTailLogStore, DiscoveredLogFile } from '@/store/tail-logs';
import { useCurrentProject } from '@/store/current-project';
import { generateLink } from '@/utils/ideHandler';
import { copyLogToMarkdown } from '@/utils/logToMarkdown';
import { useSettingsStore } from '@/store/settings';

const tailLogStore = useTailLogStore();
const colorStore = useColorStore();
const globalSearchStore = useGlobalSearchStore();
const settingsStore = useSettingsStore();
const currentProjectStore = useCurrentProject();

const expandedLogId = ref<string | null>(null);
const collapsedLogGroups = ref<Record<string, boolean>>({});
const levelFilter = ref<string[]>([]);
const copiedLogId = ref<string | null>(null);

defineProps<{
    inScreenWindow?: boolean;
    hideHeader?: boolean;
}>();

const fileName = computed(() => {
    const path = tailLogStore.filePath;
    if (!path) return '';
    return path.split(/[\\/]/).pop() || path;
});

const totalLogs = computed(() => Object.values(tailLogStore.entries).length);

const levelCounts = computed(() => {
    return Object.values(tailLogStore.entries).reduce(
        (acc, log) => {
            acc[log.level] = (acc[log.level] || 0) + 1;
            return acc;
        },
        {} as Record<string, number>
    );
});

const logs = computed(() => {
    return Object.values(tailLogStore.entries)
        .filter((log: Log) => {
            if (colorStore.colors.length > 0) {
                return colorStore.colors.includes(colorStore.match(log.color));
            }
            return true;
        })
        .filter((log: Log) => {
            const searchTerm = globalSearchStore.search.toLowerCase();
            return (
                String(log.message).toLowerCase().includes(searchTerm) ||
                log.level.includes(searchTerm) ||
                String(log.context[0]).includes(searchTerm)
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
                if (!oldLogs || oldLogs.length === 0 || newestLogId !== oldLogs[0].log_id) {
                    expandedLogId.value = newestLogId;
                }
            }
        }
    },
    { immediate: true }
);

const selectedLevel = (level: string) => {
    const index = levelFilter.value.indexOf(level);
    if (index > -1) {
        levelFilter.value.splice(index, 1);
    } else {
        levelFilter.value.push(level);
    }
};

const groupedLogsByRelativeTime = computed(() => {
    const groups: Record<string, Log[]> = {};
    for (const log of logs.value) {
        const timeKey = dayjs(log.created_at).fromNow();
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
    expandedLogId.value = expandedLogId.value === logId ? null : logId;
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
        setTimeout(() => (copiedLogId.value = null), 2000);
    } catch (error) {
        console.error('Failed to copy:', error);
    }
};

const canCopyToMarkdown = computed(() => {
    return (log: Log) => log.code_snippet && log.code_snippet.length > 0;
});

const availableFiles = computed(() => tailLogStore.availableFiles);

const refreshFiles = () => {
    tailLogStore.refreshFiles(currentProjectStore.projectInfo?.path);
};

const openFileDropdown = () => {
    refreshFiles();
};

const selectFile = (filePath: string) => {
    if (!filePath || filePath === tailLogStore.filePath) {
        (document.activeElement as HTMLElement)?.blur();
        return;
    }
    tailLogStore.setMeta({ filePath });
    window.ipcRenderer.send('tail-log:start', {
        filePath,
        projectPath: currentProjectStore.projectInfo?.path
    });
    (document.activeElement as HTMLElement)?.blur();
};

const shortDir = (file: DiscoveredLogFile) => {
    const home = currentProjectStore.projectInfo?.path ?? '';
    let dir = file.dir;
    if (home && dir.startsWith(home)) {
        dir = dir.slice(home.length).replace(/^[\\/]/, '') || '.';
    }
    return dir;
};

const pickFile = () => {
    window.ipcRenderer.send('tail-log:pick-file');
    (document.activeElement as HTMLElement)?.blur();
};

const clear = () => {
    expandedLogId.value = null;
    tailLogStore.clear();
};

const clearFile = () => {
    window.ipcRenderer.send('tail-log:clear-file');
};

onMounted(() => {
    window.addEventListener('keydown', handleKeyDown);
    refreshFiles();
    nextTick(() => {
        if (logs.value.length > 0 && (settingsStore.settings?.display_last_log ?? true)) {
            expandedLogId.value = logs.value[0].log_id;
        }
    });
});

onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown);
});

const getBorderColor = (level: string) => {
    const colors: Record<string, string> = {
        error: 'border-error',
        critical: 'border-error',
        alert: 'border-error',
        emergency: 'border-error',
        warning: 'border-warning',
        notice: 'border-success',
        info: 'border-info',
        debug: 'border-base-content/40'
    };
    return colors[level] || 'border-primary';
};

const getBgColor = (level: string) => {
    const colors: Record<string, string> = {
        error: 'bg-error/10',
        critical: 'bg-error/10',
        alert: 'bg-error/10',
        emergency: 'bg-error/10',
        warning: 'bg-warning/10',
        notice: 'bg-success/10',
        info: 'bg-info/10',
        debug: 'bg-base-content/5'
    };
    return colors[level] || '';
};

const getDotColor = (level: string) => {
    const colors: Record<string, string> = {
        error: 'bg-error',
        critical: 'bg-error',
        alert: 'bg-error',
        emergency: 'bg-error',
        warning: 'bg-warning',
        notice: 'bg-success',
        info: 'bg-info',
        debug: 'bg-base-content/40'
    };
    return colors[level] || 'bg-primary';
};
</script>

<template>
    <div>
        <div>
            <!-- Actions Bar -->
            <div
                v-if="!hideHeader"
                class="flex items-center justify-between w-full border-b border-base-content/10 h-9 px-3 gap-2"
            >
                <!-- Left: title + file -->
                <div class="flex items-center gap-2 min-w-0">
                    <span class="text-[10px] font-bold uppercase tracking-widest text-base-content/70 select-none"
                        >Tail Log</span
                    >

                    <span
                        v-if="fileName"
                        class="flex items-center gap-1.5 text-[11px] font-mono text-base-content/60 bg-base-content/5 border border-base-content/10 rounded px-2 py-0.5 truncate max-w-[220px]"
                        :data-tippy-content="tailLogStore.filePath"
                    >
                        <span
                            class="w-1.5 h-1.5 rounded-full shrink-0"
                            :class="tailLogStore.watching ? 'bg-success' : 'bg-base-content/30'"
                        ></span>
                        <span class="truncate">{{ fileName }}</span>
                    </span>
                </div>

                <!-- Right: actions -->
                <div class="flex items-center gap-1">
                    <!-- Filter Levels -->
                    <div class="dropdown dropdown-bottom dropdown-end">
                        <button
                            tabindex="0"
                            role="button"
                            class="btn btn-ghost btn-circle btn-sm"
                            data-tippy-content="Filter Levels"
                        >
                            <FunnelIcon
                                :class="levelFilter.length === 0 ? 'w-4' : 'w-5 text-primary'"
                            />
                        </button>
                        <div
                            tabindex="0"
                            class="dropdown-content z-[200] menu p-2 shadow-[0_10px_40px_rgba(0,0,0,0.5)] bg-base-200/95 backdrop-blur-xl rounded-xl border border-white/5"
                        >
                            <div class="flex flex-col gap-1.5">
                                <button
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
                                    class="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left"
                                    :class="
                                        levelFilter.includes(level)
                                            ? 'bg-base-content/10 text-base-content font-medium'
                                            : 'text-base-content/70 hover:bg-base-content/5 hover:text-base-content'
                                    "
                                >
                                    <div class="size-2.5 rounded-full relative flex items-center justify-center">
                                        <span
                                            class="relative inline-flex rounded-full size-2 transition-all duration-200"
                                            :class="
                                                levelFilter.includes(level)
                                                    ? 'bg-success shadow-[0_0_6px_rgba(34,197,94,0.8)]'
                                                    : 'bg-base-content/20'
                                            "
                                        ></span>
                                    </div>
                                    <span class="truncate capitalize text-xs whitespace-nowrap">{{ level }}</span>
                                    <span class="ml-auto text-base-content/40 text-[10px]">{{
                                        levelCounts[level] || 0
                                    }}</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Choose log file (dropdown of discovered *.log files) -->
                    <div class="dropdown dropdown-bottom dropdown-end">
                        <button
                            tabindex="0"
                            role="button"
                            class="btn btn-ghost btn-sm gap-1 px-2"
                            data-tippy-content="Choose log file"
                            @click="openFileDropdown()"
                        >
                            <DocumentTextIcon class="w-4" />
                            <ChevronDownIcon class="w-3 opacity-60" />
                        </button>
                        <div
                            tabindex="0"
                            class="dropdown-content z-[200] menu p-2 shadow-[0_10px_40px_rgba(0,0,0,0.5)] bg-base-200/95 backdrop-blur-xl rounded-xl border border-white/5 w-80 max-h-[60vh] flex-nowrap overflow-y-auto"
                        >
                            <!-- Header -->
                            <div class="flex items-center justify-between px-2 pb-1.5 mb-1 border-b border-base-content/10">
                                <span class="text-[10px] font-bold uppercase tracking-widest text-base-content/50">
                                    Log files
                                </span>
                                <button
                                    @click.stop="refreshFiles()"
                                    class="btn btn-ghost btn-xs btn-circle"
                                    data-tippy-content="Rescan"
                                >
                                    <ArrowPathIcon
                                        class="w-3.5"
                                        :class="{ 'animate-spin': tailLogStore.loadingFiles }"
                                    />
                                </button>
                            </div>

                            <!-- Empty state -->
                            <div
                                v-if="!tailLogStore.loadingFiles && availableFiles.length === 0"
                                class="px-3 py-4 text-center text-xs text-base-content/50"
                            >
                                No .log files found.
                            </div>

                            <!-- File list -->
                            <button
                                v-for="file in availableFiles"
                                :key="file.path"
                                @click="selectFile(file.path)"
                                class="flex items-start gap-2 px-3 py-2 rounded-lg transition-colors text-left w-full"
                                :class="
                                    file.path === tailLogStore.filePath
                                        ? 'bg-base-content/10 text-base-content'
                                        : 'text-base-content/70 hover:bg-base-content/5 hover:text-base-content'
                                "
                                :data-tippy-content="file.path"
                            >
                                <span
                                    class="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5"
                                    :class="file.path === tailLogStore.filePath ? 'bg-success' : 'bg-base-content/20'"
                                ></span>
                                <span class="flex flex-col min-w-0 flex-1">
                                    <span class="text-xs font-medium truncate">{{ file.name }}</span>
                                    <span class="text-[10px] font-mono text-base-content/40 truncate">{{
                                        shortDir(file)
                                    }}</span>
                                </span>
                            </button>

                            <!-- Manual browse fallback -->
                            <div class="border-t border-base-content/10 mt-1 pt-1">
                                <button
                                    @click="pickFile()"
                                    class="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-left w-full text-base-content/70 hover:bg-base-content/5 hover:text-base-content"
                                >
                                    <FolderOpenIcon class="w-4 shrink-0" />
                                    <span class="text-xs">Choose another file…</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Empty log file (truncate on disk) -->
                    <button
                        v-if="tailLogStore.filePath"
                        @click="clearFile()"
                        class="btn btn-ghost btn-circle btn-sm text-error/70 hover:text-error"
                        data-tippy-content="Clear log file contents"
                    >
                        <DocumentMinusIcon class="w-4" />
                    </button>

                    <!-- Clear view -->
                    <button
                        v-if="totalLogs > 0"
                        @click="clear()"
                        class="btn btn-ghost btn-circle btn-sm text-error/70 hover:text-error"
                        data-tippy-content="Clear view"
                    >
                        <TrashIcon class="w-4" />
                    </button>
                </div>
            </div>

            <!-- Error banner -->
            <div
                v-if="tailLogStore.error"
                class="flex items-center gap-2 text-xs text-warning bg-warning/10 border-b border-warning/20 px-3 py-2"
            >
                <ExclamationTriangleIcon class="w-4 shrink-0" />
                <span class="truncate">{{ tailLogStore.error.message }}</span>
            </div>

            <div class="h-[calc(100vh-140px)]">
                <div
                    v-if="logs.length > 0"
                    class="overflow-auto"
                    style="height: -webkit-fill-available"
                >
                    <div class="space-y-1 p-2">
                        <template
                            v-for="(logsOnTime, timeKey) in groupedLogsByRelativeTime"
                            :key="timeKey"
                        >
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

                            <template v-if="!collapsedLogGroups[timeKey]">
                                <div
                                    v-for="log in logsOnTime"
                                    :key="`tail-log-${log.log_id}`"
                                    :data-log-id="log.log_id"
                                    class="rounded-md overflow-hidden border-l-4 border-b-0"
                                    :class="[
                                        getBorderColor(log.level),
                                        getBgColor(log.level),
                                        {
                                            'blur-xs opacity-40': expandedLogId !== null && expandedLogId !== log.log_id
                                        }
                                    ]"
                                >
                                    <div
                                        class="flex items-start gap-3 p-3 cursor-pointer hover:bg-base-100/50 transition-colors text-sm"
                                        @click="toggleLogExpand(log.log_id)"
                                    >
                                        <div
                                            class="w-2 h-2 rounded-full shrink-0 mt-1.5"
                                            :class="getDotColor(log.level)"
                                        ></div>

                                        <div class="flex-1 flex flex-col gap-1 overflow-hidden min-w-0">
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

                                        <span class="text-[10px] uppercase font-bold opacity-40 shrink-0 mt-1">{{
                                            log.level
                                        }}</span>
                                    </div>

                                    <div
                                        v-if="expandedLogId === log.log_id"
                                        class="px-4 py-2"
                                    >
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

                                        <div v-if="log.code_snippet && log.code_snippet.length > 0">
                                            <CodeSnippet
                                                :code_snippet="log.code_snippet"
                                                :ide_handle="log.ide_handle"
                                            />
                                        </div>

                                        <div v-else-if="log.context && log.context.length > 0">
                                            <div class="px-1">
                                                <div v-html="log.context[0]"></div>
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
