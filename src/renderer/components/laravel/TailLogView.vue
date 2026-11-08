<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue';
import { useRowExpand } from '@/composables/useRowExpand';
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
    ArrowPathIcon,
    ArrowTopRightOnSquareIcon
} from '@heroicons/vue/24/outline';

import { Log } from '@/store/logs';
import CodeSnippet from '@/components/CodeSnippet.vue';
import ViewToolbar from '@/components/common/ViewToolbar.vue';
import IconButton from '@/components/common/IconButton.vue';
import FilterChip from '@/components/common/FilterChip.vue';
import { useColorStore } from '@/store/colors';
import EmptyState from '@/components/common/EmptyState.vue';
import { useGlobalSearchStore } from '@/store/global-search';
import { useTailLogStore, DiscoveredLogFile } from '@/store/tail-log';
import { useCurrentProject } from '@/store/current-project';
import DumpLink from '@/components/dumps/DumpLink.vue';
import { generateLink } from '@/utils/ideHandler';
import { copyLogToMarkdown } from '@/utils/logToMarkdown';
import { levelClasses } from '@/utils/logLevel';
import { useSettingsStore } from '@/store/settings';
import { useConfirm } from '@/composables/useConfirm';
import { useI18n } from 'vue-i18n';

const confirmAction = useConfirm();
const { t } = useI18n();
const tailLogStore = useTailLogStore();
const colorStore = useColorStore();
const globalSearchStore = useGlobalSearchStore();
const currentProjectStore = useCurrentProject();
const settingsStore = useSettingsStore();

const expandedLogId = ref<string | null>(null);
const { isOpen, toggle: toggleLogExpand, onRowKeydown } = useRowExpand(expandedLogId);
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

const clearFile = async () => {
    if (await confirmAction(t('confirm.empty_log_title'), t('confirm.empty_log_message'))) {
        window.ipcRenderer.send('tail-log:clear-file');
    }
};

const loadNewEntries = () => {
    tailLogStore.loadIncoming(true);
};

onMounted(() => {
    refreshFiles();
});

const showOrigin = (log: Log) => log.ide_handle.class_name !== 'empty';
</script>

<template>
    <div class="flex flex-col h-full min-h-0">
        <div class="flex flex-col flex-1 min-h-0">
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
                    <div class="dropdown dropdown-bottom dropdown-end">
                        <IconButton
                            tabindex="0"
                            role="button"
                            label="Filter"
                            :active="levelFilter.length > 0"
                        >
                            <FunnelIcon :class="levelFilter.length === 0 ? 'w-4' : 'w-4 text-primary'" />
                        </IconButton>
                        <div
                            tabindex="0"
                            class="dropdown-content z-[200] menu p-2 shadow-lg bg-base-200/95 backdrop-blur-xl rounded-xl border border-base-content/10"
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
                                            :class="levelFilter.includes(level) ? 'bg-success' : 'bg-base-content/20'"
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

                <template #title>
                    <div class="dropdown dropdown-bottom dropdown-start min-w-0">
                        <div
                            tabindex="0"
                            role="button"
                            class="flex items-center gap-1.5 h-7 -ml-2 px-2 min-w-0 rounded-md text-[13px] font-semibold text-base-content/90 hover:bg-base-content/[0.06] cursor-pointer transition-colors"
                            :data-tippy-content="tailLogStore.filePath"
                            @click="openFileDropdown()"
                        >
                            <span class="max-w-[220px] truncate">{{ fileName || $t('tail_log.select_log_file') }}</span>
                            <ChevronDownIcon class="size-3 shrink-0 text-base-content/45" />
                        </div>
                        <div
                            tabindex="0"
                            class="dropdown-content z-[200] menu p-2 shadow-lg bg-base-200/95 backdrop-blur-xl rounded-xl border border-base-content/10 w-80 max-h-[60vh] flex-nowrap overflow-y-auto"
                        >
                            <!-- Header -->
                            <div
                                class="flex items-center justify-between px-2 pb-1.5 mb-1 border-b border-base-content/10"
                            >
                                <span class="text-[10px] font-bold uppercase tracking-widest text-base-content/50">
                                    {{ $t('tail_log.log_files') }}
                                </span>
                                <button
                                    @click.stop="refreshFiles()"
                                    class="btn btn-ghost btn-xs btn-circle"
                                    :data-tippy-content="$t('tail_log.rescan')"
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
                                {{ $t('tail_log.no_log_files_found') }}
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
                                    <span class="text-xs">{{ $t('tail_log.choose_another_file') }}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </template>

                <template #right>
                    <!-- Empty log file (truncate on disk) -->
                    <IconButton
                        v-if="tailLogStore.filePath"
                        :label="$t('tail_log.clear_log_file_contents')"
                        variant="danger"
                        @click="clearFile()"
                    >
                        <DocumentMinusIcon class="w-4" />
                    </IconButton>
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

            <!-- New entries -->
            <button
                v-if="tailLogStore.incomingCount > 0"
                @click="loadNewEntries"
                class="w-full shrink-0 text-[11px] text-primary px-3 py-1.5 flex items-center justify-center gap-1.5 hover:underline"
            >
                <ArrowPathIcon class="w-3 h-3" />
                <span>{{ $t('load_new_entries', { count: tailLogStore.incomingCount }) }}</span>
            </button>

            <div class="flex-1 min-h-0">
                <div
                    v-if="logs.length > 0"
                    class="h-full overflow-y-auto overflow-x-hidden"
                >
                    <table
                        class="table table-pin-rows table-fixed w-full log-table"
                        data-row-list
                    >
                        <thead class="ld-thead">
                            <tr>
                                <th class="w-[120px]">{{ $t('level') }}</th>
                                <th>{{ $t('message') }}</th>
                                <th class="w-[190px] text-right">{{ $t('origin') }}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <template
                                v-for="(logsOnTime, timeKey) in groupedLogsByRelativeTime"
                                :key="timeKey"
                            >
                                <!-- Time Group Header -->
                                <tr class="ld-group">
                                    <td colspan="3">
                                        <button
                                            type="button"
                                            class="ld-group-label"
                                            :aria-expanded="!collapsedGroups[timeKey]"
                                            @click="toggleGroup(timeKey)"
                                        >
                                            {{ timeKey }}
                                            <ChevronDownIcon
                                                class="ld-group-chevron"
                                                :class="{ 'is-collapsed': collapsedGroups[timeKey] }"
                                            />
                                        </button>
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
                                        :data-row-id="log.log_id"
                                        tabindex="0"
                                        :aria-expanded="isOpen(log.log_id)"
                                        class="ld-row"
                                        :class="{ 'is-open': isOpen(log.log_id) }"
                                        @click="toggleLogExpand(log.log_id)"
                                        @keydown="onRowKeydown($event, log.log_id)"
                                    >
                                        <!-- Level badge -->
                                        <td class="whitespace-nowrap">
                                            <span
                                                class="inline-flex items-center gap-2 text-xs font-medium whitespace-nowrap capitalize"
                                                :class="levelClasses(log.level).text"
                                            >
                                                <span
                                                    class="size-1.5 shrink-0 rounded-full"
                                                    :class="levelClasses(log.level).dot"
                                                ></span>
                                                {{ log.level }}
                                            </span>
                                        </td>
                                        <!-- Message (single line) -->
                                        <td class="text-[13px]">
                                            <div class="flex items-center justify-between gap-2 min-w-0">
                                                <span
                                                    class="truncate min-w-0"
                                                    :title="log.message"
                                                    >{{ log.message }}</span
                                                >
                                                <span
                                                    class="font-mono text-[11px] text-base-content/35 whitespace-nowrap shrink-0"
                                                >
                                                    {{ dayjs(log.created_at).format('HH:mm:ss') }}
                                                </span>
                                            </div>
                                        </td>
                                        <!-- Origin -->
                                        <td class="text-xs truncate text-right">
                                            <div class="flex justify-end min-w-0">
                                                <DumpLink
                                                    v-if="showOrigin(log)"
                                                    :ide-handler="log.ide_handle"
                                                    truncate
                                                    middle-truncate
                                                    :max-length="24"
                                                    class="opacity-70 hover:opacity-100"
                                                />
                                                <span
                                                    v-else
                                                    class="opacity-40"
                                                    >—</span
                                                >
                                            </div>
                                        </td>
                                    </tr>

                                    <!-- Expanded Content -->
                                    <tr
                                        v-if="isOpen(log.log_id)"
                                        class="ld-row-detail"
                                    >
                                        <td
                                            colspan="3"
                                            class="!py-3"
                                        >
                                            <div
                                                class="mb-3 rounded-lg border border-base-content/10 bg-base-100 overflow-hidden"
                                            >
                                                <div
                                                    class="text-xs p-2.5 leading-relaxed font-mono break-words whitespace-pre-wrap max-h-60 overflow-y-auto"
                                                    v-text="log.message"
                                                ></div>
                                                <div
                                                    v-if="showOrigin(log) || canCopyToMarkdown(log)"
                                                    class="flex items-center gap-2 pl-2.5 pr-1 h-8 border-t border-base-content/[0.06] bg-base-content/[0.02]"
                                                >
                                                    <a
                                                        v-if="showOrigin(log)"
                                                        :href="generateLink(log.ide_handle)"
                                                        class="flex items-center gap-1.5 min-w-0 text-[11px] font-mono text-base-content/60 hover:text-base-content"
                                                        :title="`${$t('origin')}: ${log.ide_handle.real_path || log.ide_handle.class_name}:${log.ide_handle.line}`"
                                                        @click.stop
                                                    >
                                                        <ArrowTopRightOnSquareIcon class="w-3.5 h-3.5 shrink-0" />
                                                        <span class="truncate"
                                                            >{{ log.ide_handle.class_name }}:{{
                                                                log.ide_handle.line
                                                            }}</span
                                                        >
                                                    </a>
                                                    <button
                                                        v-if="canCopyToMarkdown(log)"
                                                        class="btn btn-xs btn-ghost gap-1.5 ml-auto shrink-0 font-normal text-base-content/60"
                                                        @click.stop="copyToMarkdown(log)"
                                                    >
                                                        <CheckIcon
                                                            v-if="copiedLogId === log.log_id"
                                                            class="w-3.5 text-success"
                                                        />
                                                        <ClipboardDocumentIcon
                                                            v-else
                                                            class="w-3.5"
                                                        />
                                                        {{ $t('copy_to_markdown') }}
                                                    </button>
                                                </div>
                                            </div>

                                            <div v-if="log.code_snippet && log.code_snippet.length > 0">
                                                <CodeSnippet
                                                    :code_snippet="log.code_snippet"
                                                    :ide_handle="log.ide_handle"
                                                />
                                            </div>

                                            <div v-else-if="log.context && log.context.length > 0">
                                                <div class="px-1">
                                                    <div v-safe-html="log.context[0]"></div>
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
                    class="flex items-center justify-center h-full min-h-[12rem] pointer-events-none"
                >
                    <EmptyState screen="tail_logs" />
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
@reference "./../../styles.css";

:deep(.log-table > tbody > tr > :where(th, td)) {
    @apply p-1.5 px-2;
}

:deep(.log-table) {
    border-collapse: separate;
    border-spacing: 0;
}
</style>
