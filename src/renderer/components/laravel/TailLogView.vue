<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);
import {
    FunnelIcon,
    ClipboardDocumentIcon,
    CheckIcon,
    FolderOpenIcon,
    ExclamationTriangleIcon,
    DocumentMinusIcon,
    ChevronDownIcon,
    ClockIcon,
    DocumentTextIcon,
    ArrowPathIcon,
    ArrowTopRightOnSquareIcon
} from '@heroicons/vue/24/outline';

import { Log } from '@/store/logs';
import CodeSnippet from '@/components/CodeSnippet.vue';
import ViewToolbar from '@/components/common/ViewToolbar.vue';
import FilterChip from '@/components/common/FilterChip.vue';
import { useColorStore } from '@/store/colors';
import SvgEmpty from '@/components/svg/SvgEmpty.vue';
import { useGlobalSearchStore } from '@/store/global-search';
import { useTailLogStore, DiscoveredLogFile } from '@/store/tail-log';
import { useCurrentProject } from '@/store/current-project';
import DumpLink from '@/components/dumps/DumpLink.vue';
import { generateLink } from '@/utils/ideHandler';
import { copyLogToMarkdown } from '@/utils/logToMarkdown';
import { useSettingsStore } from '@/store/settings';

const tailLogStore = useTailLogStore();
const colorStore = useColorStore();
const globalSearchStore = useGlobalSearchStore();
const currentProjectStore = useCurrentProject();
const settingsStore = useSettingsStore();

const expandedLogId = ref<string | null>(null);
const levelFilter = ref<string[]>([]);
const copiedLogId = ref<string | null>(null);
const collapsedGroups = ref<Record<string, boolean>>({});

const toggleGroup = (timeKey: string) => {
    collapsedGroups.value[timeKey] = !collapsedGroups.value[timeKey];
};

defineProps<{
    inScreenWindow?: boolean;
    hideHeader?: boolean;
}>();

const fileName = computed(() => {
    const path = tailLogStore.filePath;
    if (!path) return '';
    return path.split(/[\\/]/).pop() || path;
});

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

const isAnyLogExpanded = computed(() => {
    return expandedLogId.value !== null && (logs.value?.some((log) => log.log_id === expandedLogId.value) ?? false);
});

watch(
    logs,
    (newLogs, oldLogs) => {
        if (newLogs && newLogs.length > 0) {
            const newestLogId = newLogs[0].log_id;

            const shouldDisplayLast = settingsStore.settings?.display_last_log ?? false;
            if (shouldDisplayLast) {
                if (!oldLogs || oldLogs.length === 0 || (oldLogs.length > 0 && newestLogId !== oldLogs[0].log_id)) {
                    expandedLogId.value = newestLogId;
                }
            }
        }

        if (expandedLogId.value && (!newLogs || !newLogs.some((log) => log.log_id === expandedLogId.value))) {
            expandedLogId.value = null;
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

const clearFile = () => {
    window.ipcRenderer.send('tail-log:clear-file');
};

onMounted(() => {
    window.addEventListener('keydown', handleKeyDown);
    refreshFiles();
});

onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown);
});

type LevelColor = 'success' | 'warning' | 'info' | 'error' | 'neutral';

const colorClasses: Record<LevelColor, { badge: string; dot: string }> = {
    success: { badge: 'text-success bg-success/10', dot: 'bg-success' },
    warning: { badge: 'text-warning bg-warning/10', dot: 'bg-warning' },
    info: { badge: 'text-info bg-info/10', dot: 'bg-info' },
    error: { badge: 'text-error bg-error/10', dot: 'bg-error' },
    neutral: { badge: 'text-base-content/80 bg-base-content/10', dot: 'bg-base-content/40' }
};

const levelColorMap: Record<string, LevelColor> = {
    error: 'error',
    critical: 'error',
    alert: 'error',
    emergency: 'error',
    warning: 'warning',
    notice: 'success',
    info: 'info',
    debug: 'neutral'
};

const levelClasses = (level: string) => colorClasses[levelColorMap[level] ?? 'neutral'];

const showOrigin = (log: Log) => log.ide_handle.class_name !== 'empty';
</script>

<template>
    <div>
        <div>
            <!-- Actions Bar -->
            <ViewToolbar
                v-if="!hideHeader"
                :count="logs.length"
                noun="log"
            >
                <template #chips>
                    <FilterChip
                        v-for="lvl in levelFilter"
                        :key="lvl"
                        :label="lvl"
                        @remove="selectedLevel(lvl)"
                    />
                </template>

                <template #filter>
                    <!-- Filter Levels -->
                    <div class="dropdown dropdown-bottom dropdown-start">
                        <button
                            tabindex="0"
                            role="button"
                            class="btn btn-ghost btn-circle btn-sm"
                            data-tippy-content="Filter Levels"
                        >
                            <FunnelIcon :class="levelFilter.length === 0 ? 'w-4' : 'w-4 text-primary'" />
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
                </template>

                <template #right>
                    <!-- Watched file chip -->
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
                            <div
                                class="flex items-center justify-between px-2 pb-1.5 mb-1 border-b border-base-content/10"
                            >
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
                </template>
            </ViewToolbar>

            <!-- Error banner -->
            <div
                v-if="tailLogStore.error"
                class="flex items-center gap-2 text-xs text-warning bg-warning/10 border-b border-warning/20 px-3 py-2"
            >
                <ExclamationTriangleIcon class="w-4 shrink-0" />
                <span class="truncate">{{ tailLogStore.error.message }}</span>
            </div>

            <div class="h-[calc(100vh-140px)] pt-3">
                <div
                    v-if="logs.length > 0"
                    class="overflow-y-auto overflow-x-hidden px-3"
                    style="height: -webkit-fill-available"
                >
                    <table class="table table-pin-rows table-fixed w-full log-table">
                        <thead>
                            <tr class="text-xs bg-base-300! font-light text-base-content">
                                <th class="w-[120px]">Level</th>
                                <th>Message</th>
                                <th class="w-[190px]">Origin</th>
                            </tr>
                        </thead>
                        <tbody>
                            <template
                                v-for="(logsOnTime, timeKey) in groupedLogsByRelativeTime"
                                :key="timeKey"
                            >
                                <!-- Time Group Header -->
                                <tr
                                    class="bg-base-200/60"
                                    :class="{
                                        'blur-sm opacity-40':
                                            isAnyLogExpanded && !logsOnTime?.some((log) => log.log_id === expandedLogId)
                                    }"
                                >
                                    <td
                                        colspan="3"
                                        class="p-0!"
                                    >
                                        <div
                                            class="group flex items-center gap-2.5 px-3 py-2 cursor-pointer select-none"
                                            @click="toggleGroup(timeKey)"
                                        >
                                            <ClockIcon class="w-3.5 h-3.5 text-base-content/40 shrink-0" />
                                            <span
                                                class="text-xs tracking-wider text-base-content/70 group-hover:text-base-content whitespace-nowrap transition-colors"
                                            >
                                                {{ timeKey }}
                                            </span>
                                            <span class="h-px flex-1 bg-base-content/10"></span>
                                            <span
                                                class="font-mono text-[10px] text-base-content/50 bg-base-content/10 rounded-full px-2 py-0.5 shrink-0"
                                            >
                                                {{ logsOnTime.length }}
                                            </span>
                                            <ChevronDownIcon
                                                class="w-3.5 h-3.5 text-base-content/40 shrink-0 transition-transform duration-200"
                                                :class="{ '-rotate-90': collapsedGroups[timeKey] }"
                                            />
                                        </div>
                                    </td>
                                </tr>

                                <!-- Logs -->
                                <template
                                    v-for="log in logsOnTime"
                                    v-if="!collapsedGroups[timeKey]"
                                    :key="`tail-log-${log.log_id}`"
                                >
                                    <!-- Log Row -->
                                    <tr
                                        :data-log-id="log.log_id"
                                        @click="toggleLogExpand(log.log_id)"
                                        class="hover:bg-base-100 cursor-pointer transition-all duration-200"
                                        :class="[
                                            { 'bg-base-300': expandedLogId === log.log_id },
                                            {
                                                'blur-xs opacity-40': isAnyLogExpanded && expandedLogId !== log.log_id
                                            }
                                        ]"
                                    >
                                        <!-- Level badge -->
                                        <td>
                                            <span
                                                class="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-md whitespace-nowrap uppercase"
                                                :class="levelClasses(log.level).badge"
                                            >
                                                <span
                                                    class="w-1.5 h-1.5 rounded-full"
                                                    :class="levelClasses(log.level).dot"
                                                ></span>
                                                {{ log.level }}
                                            </span>
                                        </td>
                                        <!-- Message (single line) -->
                                        <td class="text-xs truncate">
                                            <span :title="log.message">{{ log.message }}</span>
                                        </td>
                                        <!-- Origin -->
                                        <td class="text-xs truncate">
                                            <DumpLink
                                                v-if="showOrigin(log)"
                                                :ide-handler="log.ide_handle"
                                                truncate
                                                class="opacity-70 hover:opacity-100"
                                            />
                                            <span
                                                v-else
                                                class="opacity-40"
                                                >—</span
                                            >
                                        </td>
                                    </tr>

                                    <!-- Expanded Content -->
                                    <tr
                                        v-if="expandedLogId === log.log_id"
                                        class="bg-base-200/60"
                                    >
                                        <td
                                            colspan="3"
                                            class="!py-3"
                                        >
                                            <!-- Full message + timestamp -->
                                            <div class="mb-3">
                                                <div
                                                    class="text-[10px] uppercase tracking-widest text-base-content/50 mb-1"
                                                >
                                                    Message
                                                </div>
                                                <div
                                                    class="text-xs bg-base-100 border border-base-content/10 rounded-lg p-2.5 leading-relaxed font-mono break-words whitespace-pre-wrap"
                                                >
                                                    {{ log.message }}
                                                </div>
                                                <div class="text-[10px] text-base-content/50 mt-1.5 font-mono">
                                                    {{ dayjs(log.created_at).format('YYYY-MM-DD HH:mm:ss') }}
                                                </div>
                                            </div>

                                            <!-- Origin (full) -->
                                            <div
                                                v-if="showOrigin(log)"
                                                class="mb-3"
                                            >
                                                <div
                                                    class="text-[10px] uppercase tracking-widest text-base-content/50 mb-1"
                                                >
                                                    Origin
                                                </div>
                                                <a
                                                    :href="generateLink(log.ide_handle)"
                                                    class="inline-flex items-start gap-1.5 text-xs link link-hover text-base-content/80 font-mono break-all"
                                                    @click.stop
                                                >
                                                    <ArrowTopRightOnSquareIcon class="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                                    <span
                                                        >{{ log.ide_handle.class_name }}:{{ log.ide_handle.line }}</span
                                                    >
                                                </a>
                                            </div>

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
                                        </td>
                                    </tr>
                                </template>
                            </template>
                        </tbody>
                    </table>
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

<style scoped>
@reference "./../../styles.css";

:deep(.log-table > thead) :where(th, td) {
    @apply p-2;
}

:deep(.log-table > tbody > tr > :where(th, td)) {
    @apply p-1.5 px-2;
}
</style>
