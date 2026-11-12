<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);
import {
    FunnelIcon,
    PlayIcon,
    ClipboardDocumentIcon,
    CheckIcon,
    CogIcon,
    ChevronDownIcon,
    ArrowTopRightOnSquareIcon,
    ArrowPathIcon
} from '@heroicons/vue/24/outline';

import { Log, useLogStore } from '@/store/logs';
import ViewToolbar from '@/components/common/ViewToolbar.vue';
import IconButton from '@/components/common/IconButton.vue';
import PauseBanner from '@/components/common/PauseBanner.vue';
import FilterChip from '@/components/common/FilterChip.vue';
import MenuRow from '@/components/navbar/MenuRow.vue';
import CodeSnippet from '@/components/CodeSnippet.vue';
import RelatedJobButton from '@/components/shared/RelatedJobButton.vue';
import { useColorStore } from '@/store/colors';
import { useRowExpand } from '@/composables/useRowExpand';
import EmptyState from '@/components/common/EmptyState.vue';
import { useGlobalSearchStore } from '@/store/global-search';
import IconPause from '@/components/Icons/IconPause.vue';
import { usePauseLogsStore } from '@/store/pauses';
import DumpQuery from '@/components/laravel/DumpQuery.vue';
import DumpLink from '@/components/dumps/DumpLink.vue';
import { generateLink } from '@/utils/ideHandler';
import { copyLogToMarkdown } from '@/utils/logToMarkdown';
import { levelClasses } from '@/utils/logLevel';
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
const { isOpen, toggle: toggleLogExpand, onRowKeydown } = useRowExpand(expandedLogId);
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
    items?: Record<string, Log>;
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

const clear = () => {
    if (pauseLogsStore.is_paused) {
        pauseLogsStore.toggle();
    }

    expandedLogId.value = null;
    expandedRequestLogIds.value = new Set();
    logStore.clear();
    visibleLimit.value = logStore.pageSize;
};

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
                :can-clear="totalLogs > 0"
                @clear="clear"
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
                    <div class="dropdown dropdown-bottom dropdown-end">
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
                            role="menu"
                            aria-label="Filter"
                            class="dropdown-content mt-2 z-[200] w-56 max-h-[70vh] overflow-y-auto p-1 rounded-lg border border-base-content/10 bg-base-100 shadow-xl"
                        >
                            <MenuRow
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
                                role="menuitemcheckbox"
                                :aria-checked="levelFilter.includes(level)"
                                :label="level.charAt(0).toUpperCase() + level.slice(1)"
                                :value="levelCounts[level] || 0"
                                @click="selectedLevel(level)"
                            >
                                <CheckIcon
                                    class="size-4 text-primary"
                                    :class="{ invisible: !levelFilter.includes(level) }"
                                />
                            </MenuRow>
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
                            role="menu"
                            :aria-label="$t('settings.settings')"
                            class="dropdown-content mt-2 z-[200] w-56 max-h-[70vh] overflow-y-auto p-1 rounded-lg border border-base-content/10 bg-base-100 shadow-xl"
                        >
                            <template v-if="yamlLogLevels.length > 0">
                                <p class="px-2 pt-1 pb-0.5 text-[0.7rem] text-base-content/45">Levels to observe</p>
                                <MenuRow
                                    v-for="control in yamlLogLevels"
                                    :key="control.key"
                                    toggle
                                    :label="control.label"
                                    :model-value="control.enabled"
                                    @update:model-value="toggleYamlControl('logs', control.key, control.enabled)"
                                />
                            </template>
                        </div>
                    </div>

                    <div class="w-px h-4 bg-base-content/10 mx-0.5"></div>

                    <!-- Pause -->
                    <IconButton
                        :label="pauseLogsStore.is_paused ? $t('resume') : $t('pause')"
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
                </template>
            </ViewToolbar>

            <!-- Pause Banner -->
            <PauseBanner
                :paused="pauseLogsStore.is_paused"
                class="relative z-20"
            />

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
                    class="pb-3"
                >
                    <div ref="listTopRef"></div>
                    <table
                        class="table table-fixed w-full log-table"
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
                                    :key="`log-group-${log.log_id}`"
                                >
                                    <!-- Log Row -->
                                    <tr
                                        :data-log-id="log.log_id"
                                        :data-row-id="log.log_id"
                                        :id="`ld-anchor-${log.log_id}`"
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
                                                <div class="flex items-center gap-2 shrink-0">
                                                    <RelatedJobButton
                                                        v-if="log.related_job"
                                                        :related-job="log.related_job"
                                                        :origin-id="log.log_id"
                                                    />
                                                    <span
                                                        class="font-mono text-[11px] text-base-content/35 whitespace-nowrap"
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
                                                    <div v-safe-html="log.context[0]"></div>
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
                    <EmptyState screen="logs" />
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
