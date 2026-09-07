<script setup lang="ts">
import { computed, ref, watch, nextTick, onMounted, onUnmounted } from 'vue';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);
import {
    FunnelIcon,
    PlayIcon,
    TrashIcon,
    ClipboardDocumentIcon,
    CheckIcon,
    CogIcon,
    ChevronDownIcon,
    ClockIcon,
    ArrowTopRightOnSquareIcon,
    ArrowPathIcon
} from '@heroicons/vue/24/outline';

import { Log, useLogStore } from '@/store/logs';
import ViewToolbar from '@/components/common/ViewToolbar.vue';
import IconButton from '@/components/common/IconButton.vue';
import FilterChip from '@/components/common/FilterChip.vue';
import CodeSnippet from '@/components/CodeSnippet.vue';
import RelatedJobButton from '@/components/shared/RelatedJobButton.vue';
import { useColorStore } from '@/store/colors';
import EmptyState from '@/components/common/EmptyState.vue';
import { useGlobalSearchStore } from '@/store/global-search';
import IconPause from '@/components/Icons/IconPause.vue';
import { usePauseLogsStore } from '@/store/pauses';
import DumpQuery from '@/components/laravel/DumpQuery.vue';
import DumpLink from '@/components/dumps/DumpLink.vue';
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
const levelFilter = ref<string[]>([]);
const copiedLogId = ref<string | null>(null);
const expandedRequestLogIds = ref<Set<string>>(new Set());
const collapsedGroups = ref<Record<string, boolean>>({});

const toggleGroup = (timeKey: string) => {
    collapsedGroups.value[timeKey] = !collapsedGroups.value[timeKey];
};

const toggleRequestSection = (logId: string) => {
    const s = expandedRequestLogIds.value;

    if (s.has(logId)) {
        s.delete(logId);
    } else {
        s.add(logId);
    }

    expandedRequestLogIds.value = new Set(s);
};

const props = defineProps<{
    items: Record<string, Log>;
    inScreenWindow: boolean;
    yamlConfig?: Record<string, any>;
    hideHeader?: boolean;
}>();

const sourceLogs = computed(() => {
    if (props.inScreenWindow) {
        return props.items || {};
    }

    return logStore.logs;
});

const totalLogs = computed(() => Object.values(sourceLogs.value).length);

const levelCounts = computed(() => {
    return Object.values(sourceLogs.value).reduce(
        (acc, log) => {
            acc[log.level] = (acc[log.level] || 0) + 1;
            return acc;
        },
        {} as Record<string, number>
    );
});

const logs = computed(() => {
    forceUpdate.value;

    const items = sourceLogs.value;

    return Object.values(items)
        .filter((log: Log) => {
            if (colorStore.colors.length > 0) {
                return colorStore.colors.includes(colorStore.match(log.color));
            }
            return true;
        })
        .filter((log: Log) => {
            const searchTerm = globalSearchStore.search.toLowerCase();
            const messageMatch = log.message ? String(log.message).toLowerCase().includes(searchTerm) : false;
            const levelMatch = log.level ? String(log.level).toLowerCase().includes(searchTerm) : false;
            const contextZero =
                Array.isArray(log.context) && log.context.length > 0
                    ? String(log.context[0])
                    : typeof log.context === 'string'
                      ? log.context
                      : '';
            const contextMatch = contextZero.toLowerCase().includes(searchTerm);

            return messageMatch || levelMatch || contextMatch;
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

const visibleLimit = ref(logStore.pageSize);
const listRef = ref<HTMLElement | null>(null);
const listTopRef = ref<HTMLElement | null>(null);
const listBottomRef = ref<HTMLElement | null>(null);

const visibleLogs = computed(() => logs.value.slice(0, visibleLimit.value));

const hasMore = computed(() => logs.value.length > visibleLimit.value);

const scrollListTo = (el: HTMLElement | null, block: 'start' | 'end') => {
    const scroller = listRef.value;
    if (!scroller || !el) {
        return;
    }

    const top = block === 'start' ? 0 : scroller.scrollHeight - scroller.clientHeight;
    scroller.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
};

const loadMore = async () => {
    visibleLimit.value += logStore.pageSize;
    await nextTick();
    scrollListTo(listBottomRef.value, 'end');
};

const loadNewEntries = async () => {
    logStore.loadIncoming(true);
    visibleLimit.value = logStore.pageSize;
    await nextTick();
    scrollListTo(listTopRef.value, 'start');
};

watch(
    [levelFilter, () => globalSearchStore.search],
    () => {
        visibleLimit.value = logStore.pageSize;
    },
    { deep: true }
);

const displayLastLog = computed<boolean>({
    get: () => {
        return settingsStore.settings?.display_last_log ?? false;
    },
    set: (val: boolean) => {
        if (!settingsStore.settings) return;
        settingsStore.settings.display_last_log = val;
        settingsStore.update();
        if (!val) {
            expandedLogId.value = null;
        }
    }
});

const isAnyLogExpanded = computed(() => {
    if (expandedLogId.value === null) return false;
    const focused = logs.value?.find((log) => log.log_id === expandedLogId.value);
    if (!focused) return false;
    const timeKey = dayjs(focused.created_at).fromNow();
    return !collapsedGroups.value[timeKey];
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

watch(expandedLogId, (newId) => {
    if (newId === null) {
        return;
    }

    nextTick(() => {
        const findLog = logs.value.find((log) => log.log_id === newId);
        if (!findLog || !findLog.context) return;
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
    for (const log of visibleLogs.value) {
        const timeKey = dayjs(log.created_at).fromNow();
        if (!groups[timeKey]) {
            groups[timeKey] = [];
        }
        groups[timeKey].push(log);
    }
    return groups;
});

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
    expandedRequestLogIds.value = new Set();
    logStore.clear();
    visibleLimit.value = logStore.pageSize;
};

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

const showOrigin = (log: Log) => {
    const { class_name, line } = log.ide_handle;
    return class_name !== 'empty' && !(class_name === 'unknown' && String(line) === '0');
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
</script>

<template>
    <div class="flex flex-col h-full max-h-full min-h-0 min-w-0 overflow-hidden">
        <div class="flex flex-col h-full min-h-0">
            <!-- Actions Bar -->
            <ViewToolbar
                v-if="!hideHeader"
                class="relative z-20 shrink-0 bg-base-200"
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
                        <IconButton
                            tabindex="0"
                            role="button"
                            label="Filter"
                            :active="levelFilter.length > 0"
                        >
                            <FunnelIcon
                                v-if="levelFilter.length === 0"
                                class="w-4"
                            />
                            <FunnelIcon
                                v-else
                                class="w-4 text-primary"
                            />
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
                                            v-if="levelFilter.includes(level)"
                                            class="absolute inline-flex h-full w-full rounded-full bg-success opacity-20"
                                        ></span>
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

                <template #right>
                    <!-- Auto Expand Toggle -->
                    <div class="flex items-center gap-1.5 px-1">
                        <label
                            for="toggle-display-last"
                            class="text-xs text-base-content/50 select-none cursor-pointer"
                            >Auto expand</label
                        >
                        <input
                            id="toggle-display-last"
                            type="checkbox"
                            class="toggle toggle-xs toggle-success"
                            v-model="displayLastLog"
                            data-tippy-content="Auto expand newest log"
                        />
                    </div>

                    <!-- YAML Configuration Dropdown -->
                    <div class="dropdown dropdown-bottom dropdown-end">
                        <IconButton
                            tabindex="0"
                            role="button"
                            label="Settings"
                            variant="base"
                        >
                            <CogIcon class="w-4" />
                        </IconButton>
                        <div
                            tabindex="0"
                            class="dropdown-content z-[200] menu p-2 shadow-lg bg-base-200/95 backdrop-blur-xl rounded-xl border border-base-content/10"
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
                                        class="flex items-center gap-3 px-3 hover:bg-base-content/5 py-2 rounded-lg transition-colors text-left"
                                        :class="
                                            control.enabled
                                                ? 'text-base-content font-medium'
                                                : 'text-base-content/70 hover:text-base-content'
                                        "
                                    >
                                        <div class="size-2.5 rounded-full relative flex items-center justify-center">
                                            <span
                                                v-if="control.enabled"
                                                class="absolute inline-flex h-full w-full rounded-full bg-success opacity-20"
                                            ></span>
                                            <span
                                                class="relative inline-flex rounded-full size-2 transition-all duration-200"
                                                :class="control.enabled ? 'bg-success' : 'bg-base-content/20'"
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

                    <div class="w-px h-4 bg-base-content/10 mx-0.5"></div>

                    <!-- Pause -->
                    <IconButton
                        label="Pause"
                        variant="base"
                        @click="pauseLogsStore.toggle()"
                    >
                        <PlayIcon
                            v-if="pauseLogsStore.is_paused"
                            class="w-4 text-warning"
                        />
                        <IconPause
                            v-else
                            class="w-4"
                        />
                    </IconButton>

                    <!-- Clear -->
                    <IconButton
                        v-if="totalLogs > 0"
                        label="Clear all"
                        variant="danger"
                        @click="clear()"
                    >
                        <TrashIcon class="w-4" />
                    </IconButton>
                </template>
            </ViewToolbar>

            <!-- Pause Banner -->
            <div
                v-if="pauseLogsStore.is_paused"
                class="relative z-20 shrink-0 bg-warning/10 text-warning text-[10px] px-3 py-1.5 flex items-center gap-2 border-b border-warning/20"
            >
                <PlayIcon class="w-3 h-3" />
                <span>{{ $t('app.inactive_banner') }}</span>
            </div>

            <!-- New entries -->
            <button
                v-if="!inScreenWindow && logStore.incomingCount > 0"
                @click="loadNewEntries"
                class="w-full shrink-0 text-[11px] text-primary px-3 py-1.5 flex items-center justify-center gap-1.5 hover:underline"
            >
                <ArrowPathIcon class="w-3 h-3" />
                <span>{{ $t('load_new_entries', { count: logStore.incomingCount }) }}</span>
            </button>

            <div
                ref="listRef"
                class="flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
            >
                <div
                    v-if="logs.length > 0"
                    class="px-3 pb-3"
                >
                    <div ref="listTopRef"></div>
                    <table class="table table-zebra table-fixed w-full log-table">
                        <thead>
                            <tr class="text-xs font-light text-base-content">
                                <th class="w-[90px]">{{ $t('level') }}</th>
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
                                <tr
                                    class="bg-base-200/60"
                                    :class="{ 'blur-sm opacity-40': isAnyLogExpanded }"
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
                                    :key="`log-group-${log.log_id}`"
                                >
                                    <!-- Log Row -->
                                    <tr
                                        :data-log-id="log.log_id"
                                        :id="`ld-anchor-${log.log_id}`"
                                        @click="toggleLogExpand(log.log_id)"
                                        class="hover:bg-base-100 cursor-pointer transition-all duration-200"
                                        :class="[
                                            { 'ld-focus-row relative z-10': expandedLogId === log.log_id },
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
                                        <td class="text-xs">
                                            <div class="flex items-center justify-between gap-2 min-w-0">
                                                <span
                                                    class="truncate min-w-0"
                                                    :title="log.message"
                                                    >{{ log.message }}</span
                                                >
                                                <div class="flex items-center gap-2 shrink-0">
                                                    <RelatedJobButton
                                                        v-if="log.related_job"
                                                        :related-job="log.related_job"
                                                        :origin-id="log.log_id"
                                                    />
                                                    <span
                                                        class="font-mono text-[10px] text-base-content/50 whitespace-nowrap"
                                                    >
                                                        {{ dayjs(log.created_at).format('HH:mm:ss') }}
                                                    </span>
                                                </div>
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
                                        v-if="expandedLogId === log.log_id"
                                        class="ld-focus-detail relative z-10"
                                    >
                                        <td
                                            colspan="3"
                                            class="!py-3"
                                        >
                                            <!-- Full message + timestamp -->
                                            <div class="mb-3">
                                                <div
                                                    class="text-xs bg-base-100 border border-base-content/10 rounded-lg p-2.5 leading-relaxed font-mono break-words whitespace-pre-wrap"
                                                >
                                                    {{ log.message }}
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
                                                    {{ $t('origin') }}
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

                                            <!-- Copy to Markdown Button -->
                                            <div
                                                v-if="canCopyToMarkdown(log)"
                                                class="flex justify-end mb-2"
                                            >
                                                <button
                                                    @click.stop="copyToMarkdown(log)"
                                                    class="btn btn-sm btn-soft gap-2"
                                                    :data-tippy-content="$t('copy_to_markdown')"
                                                >
                                                    <CheckIcon
                                                        v-if="copiedLogId === log.log_id"
                                                        class="w-4 text-success"
                                                    />
                                                    <ClipboardDocumentIcon
                                                        v-else
                                                        class="w-4"
                                                    />
                                                    {{ $t('copy_to_markdown') }}
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

                                            <!-- Request / Routing / Queries — collapsible toggle -->
                                            <div
                                                v-if="
                                                    log.requests &&
                                                    (log.requests.headers ||
                                                        log.requests.body ||
                                                        Object.keys(log.requests?.routeContext || {}).length > 0 ||
                                                        (log.queries && log.queries.length > 0))
                                                "
                                                class="mt-3"
                                            >
                                                <!-- Toggle button -->
                                                <button
                                                    class="flex items-center gap-1.5 text-xs text-base-content/50 hover:text-base-content/80 transition-colors"
                                                    @click.stop="toggleRequestSection(log.log_id)"
                                                >
                                                    <ChevronDownIcon
                                                        class="w-3.5 h-3.5 transition-transform duration-200"
                                                        :class="{ 'rotate-180': expandedRequestLogIds.has(log.log_id) }"
                                                    />
                                                    <span>Request</span>
                                                </button>

                                                <!-- Collapsible content -->
                                                <div
                                                    v-if="expandedRequestLogIds.has(log.log_id)"
                                                    class="mt-3 space-y-4"
                                                >
                                                    <!-- Headers -->
                                                    <div
                                                        v-if="
                                                            log.requests.headers &&
                                                            Object.keys(log.requests.headers).length > 0
                                                        "
                                                        class="space-y-1"
                                                    >
                                                        <span class="font-semibold ml-1 text-xs">Headers</span>
                                                        <div
                                                            class="overflow-x-auto rounded-md border border-base-content/10 bg-base-200"
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
                                                        class="space-y-1"
                                                    >
                                                        <span class="font-semibold ml-1 text-xs">Body</span>
                                                        <div
                                                            class="overflow-x-auto rounded-md border border-base-content/10 bg-base-200"
                                                        >
                                                            <pre
                                                                class="scrollbar-hidden mx-5 my-3 overflow-y-hidden text-xs lg:text-sm"
                                                            ><code class="overflow-y-hidden scrollbar-hidden overflow-x-scroll scrollbar-hidden-x">{{ log.requests.body }}</code></pre>
                                                        </div>
                                                    </div>

                                                    <!-- Routing -->
                                                    <div
                                                        v-if="Object.keys(log.requests?.routeContext || {}).length > 0"
                                                        class="space-y-1"
                                                    >
                                                        <span class="font-semibold ml-1 text-xs">Routing</span>
                                                        <div
                                                            class="overflow-x-auto rounded-md border border-base-content/10 bg-base-200"
                                                        >
                                                            <table class="table table-sm">
                                                                <tbody>
                                                                    <tr v-if="log.requests.routeContext?.controller">
                                                                        <th>Controller</th>
                                                                        <td>
                                                                            {{ log.requests.routeContext.controller }}
                                                                        </td>
                                                                    </tr>
                                                                    <tr v-if="log.requests.routeContext?.middleware">
                                                                        <th>Middleware</th>
                                                                        <td>
                                                                            {{ log.requests.routeContext.middleware }}
                                                                        </td>
                                                                    </tr>
                                                                    <tr v-if="log.requests.routeContext?.routeName">
                                                                        <th>Route name</th>
                                                                        <td>
                                                                            {{ log.requests.routeContext.routeName }}
                                                                        </td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>

                                                    <!-- Queries -->
                                                    <div
                                                        v-if="log.queries && log.queries.length > 0"
                                                        class="space-y-2"
                                                    >
                                                        <span class="font-semibold ml-1 text-xs">Queries</span>
                                                        <div
                                                            v-for="(query, queryIndex) in log.queries"
                                                            :key="queryIndex"
                                                            class="border border-base-content/10 rounded p-2 bg-base-200"
                                                        >
                                                            <DumpQuery :query="query" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                </template>
                            </template>
                        </tbody>
                    </table>

                    <div
                        v-if="hasMore"
                        class="py-3 flex justify-center"
                    >
                        <button
                            @click="loadMore"
                            class="btn btn-ghost btn-xs text-base-content/70"
                        >
                            {{ $t('load_more', { count: logs.length - visibleLogs.length }) }}
                        </button>
                    </div>
                    <div ref="listBottomRef"></div>
                </div>

                <div
                    v-else
                    class="flex items-center justify-center h-full min-h-[12rem] pointer-events-none"
                >
                    <EmptyState />
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

:deep(.log-table thead th) {
    position: sticky;
    top: 0;
    z-index: 10;
    background-color: var(--color-base-300);
}

:deep(.log-table > tbody > tr > :where(th, td)) {
    @apply p-1.5 px-2;
}

/* Focused log renders as a floating card above the blurred background */
:deep(.log-table) {
    border-collapse: separate;
    border-spacing: 0;
}

:deep(.log-table tr.ld-focus-row > td),
:deep(.log-table tr.ld-focus-detail > td) {
    background-color: var(--color-base-100);
}

:deep(.log-table tr.ld-focus-row > td) {
    box-shadow: 0 -12px 28px -14px rgba(0, 0, 0, 0.4);
}

:deep(.log-table tr.ld-focus-row > td:first-child) {
    border-top-left-radius: 0.6rem;
    box-shadow: -10px -12px 28px -14px rgba(0, 0, 0, 0.4);
}

:deep(.log-table tr.ld-focus-row > td:last-child) {
    border-top-right-radius: 0.6rem;
    box-shadow: 10px -12px 28px -14px rgba(0, 0, 0, 0.4);
}

:deep(.log-table tr.ld-focus-detail > td) {
    border-bottom-left-radius: 0.6rem;
    border-bottom-right-radius: 0.6rem;
    box-shadow: 0 14px 28px -14px rgba(0, 0, 0, 0.4);
}
</style>
