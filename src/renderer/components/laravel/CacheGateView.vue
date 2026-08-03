<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);
import VueJsonPretty from 'vue-json-pretty';

import { Payload } from '@/types/Payload';
import { usePayloadStore } from '@/store/payload';
import { usePausePayloadStore } from '@/store/pause';
import { useGlobalSearchStore } from '@/store/global-search';

import { PlayIcon, TrashIcon } from '@heroicons/vue/24/outline';
import { FunnelIcon } from '@heroicons/vue/24/outline';
import { FunnelIcon as FunnelSolidIcon } from '@heroicons/vue/24/solid';
import IconPause from '@/components/Icons/IconPause.vue';
import DumpLink from '@/components/dumps/DumpLink.vue';
import RelatedJobButton from '@/components/shared/RelatedJobButton.vue';
import SvgEmpty from '@/components/svg/SvgEmpty.vue';

const props = defineProps<{
    screen: 'cache' | 'gate';
    items?: Payload[];
    inScreenWindow?: boolean;
    hideHeader?: boolean;
}>();

const payloadStore = usePayloadStore();
const pauseStore = usePausePayloadStore();
const globalSearchStore = useGlobalSearchStore();

const typeFilter = ref<string | null>(null);
const expanded = ref<Record<string, boolean>>({});

type EventColor = 'success' | 'warning' | 'info' | 'error' | 'neutral';

const colorClasses: Record<EventColor, { text: string; badge: string; dot: string }> = {
    success: { text: 'text-success', badge: 'text-success bg-success/10', dot: 'bg-success' },
    warning: { text: 'text-warning', badge: 'text-warning bg-warning/10', dot: 'bg-warning' },
    info: { text: 'text-info', badge: 'text-info bg-info/10', dot: 'bg-info' },
    error: { text: 'text-error', badge: 'text-error bg-error/10', dot: 'bg-error' },
    neutral: { text: 'text-base-content', badge: 'text-base-content/80 bg-base-content/10', dot: 'bg-base-content/40' }
};

const eventStyles: Record<string, { color: EventColor; label: string }> = {
    hit: { color: 'success', label: 'Hit' },
    missed: { color: 'warning', label: 'Missed' },
    miss: { color: 'warning', label: 'Missed' },
    'key written': { color: 'info', label: 'Key written' },
    written: { color: 'info', label: 'Key written' },
    'key set': { color: 'info', label: 'Key set' },
    set: { color: 'info', label: 'Key set' },
    forgotten: { color: 'error', label: 'Forgotten' },
    'key forgotten': { color: 'error', label: 'Forgotten' },
    deleted: { color: 'error', label: 'Deleted' },
    allowed: { color: 'success', label: 'Allowed' },
    allow: { color: 'success', label: 'Allowed' },
    denied: { color: 'error', label: 'Denied' },
    deny: { color: 'error', label: 'Denied' }
};

const title = computed(() => (props.screen === 'gate' ? 'Gate' : 'Cache'));

const columnConfig = computed(() =>
    props.screen === 'gate'
        ? { headers: ['Ability', 'Arguments'], primaryIndex: 0, secondaryIndex: 2 }
        : { headers: ['Key', 'Value'], primaryIndex: 0, secondaryIndex: 1 }
);

const columnLabels = computed(() => columnConfig.value.headers);

const styleFor = (label: string): { color: EventColor; label: string } => {
    const key = (label || '').toLowerCase().trim();
    return eventStyles[key] || { color: 'neutral', label: label || '—' };
};

const classesFor = (label: string) => colorClasses[styleFor(label).color];

const eventLabel = (payload: Payload): string => {
    if (props.screen === 'gate') {
        const result = payload.table_v2?.values?.['Result'];
        const value = Array.isArray(result) ? result[0] : result;
        if (value) return String(value);
    }

    return payload.with_label?.label ?? '';
};

const stripTags = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/<[^>]*>?/gm, '')
        .replace(/\s+/g, ' ')
        .trim();
};

interface DetailCell {
    column: string;
    isJsonPretty: boolean;
    isSfDump: boolean;
    jsonData: unknown;
    html: string | null;
    sfDumpId: string | null;
    text: string | null;
}

const detailCells = (payload: Payload): DetailCell[] => {
    const values = payload.table_v2?.values ?? {};
    return Object.entries(values).map(([column, val]) => {
        const isArray = Array.isArray(val);
        const isJsonPretty = isArray && typeof val[0] === 'object' && typeof val[1] === 'object';
        const isSfDump = isArray && !isJsonPretty;

        return {
            column,
            isJsonPretty,
            isSfDump,
            jsonData: isJsonPretty ? val[0] : null,
            html: isSfDump ? val[0] : null,
            sfDumpId: isSfDump ? val[1] : null,
            text: !isArray ? String(val ?? '') : null
        };
    });
};

const cellPreview = (payload: Payload, index: number): string => {
    const val = Object.values(payload.table_v2?.values ?? {})[index];
    const raw = Array.isArray(val) ? val[0] : val;

    if (raw !== null && typeof raw === 'object') {
        try {
            return JSON.stringify(raw);
        } catch (e) {
            return '{…}';
        }
    }

    return stripTags(raw);
};

const primaryCell = (payload: Payload): string => cellPreview(payload, columnConfig.value.primaryIndex);
const secondaryCell = (payload: Payload): string => cellPreview(payload, columnConfig.value.secondaryIndex);

const source = computed<Payload[]>(() => props.items ?? payloadStore.get(props.screen));

const items = computed<Payload[]>(() => {
    const search = globalSearchStore.search.toLowerCase();

    return source.value
        .filter((payload) => {
            const label = styleFor(eventLabel(payload)).label;
            const matchesType = !typeFilter.value || label === typeFilter.value;

            const haystack = `${label} ${primaryCell(payload)} ${secondaryCell(payload)}`.toLowerCase();
            const matchesSearch = !search || haystack.includes(search);

            return matchesType && matchesSearch;
        })
        .sort((a, b) => new Date(b.date_time).getTime() - new Date(a.date_time).getTime());
});

const groupedByRelativeTime = computed(() => {
    const groups: Record<string, Payload[]> = {};

    for (const payload of items.value) {
        const timeKey = dayjs(payload.date_time).fromNow();
        (groups[timeKey] ||= []).push(payload);
    }

    return groups;
});

const typeCounts = computed(() => {
    return source.value.reduce(
        (acc, payload) => {
            const label = styleFor(eventLabel(payload)).label;
            acc[label] = (acc[label] || 0) + 1;
            return acc;
        },
        {} as Record<string, number>
    );
});

const isFiltering = computed(() => !!typeFilter.value);

const selectType = (label: string) => {
    typeFilter.value = typeFilter.value === label ? null : label;
};

const toggleExpand = (payload: Payload) => {
    const id = payload.id;
    expanded.value[id] = !expanded.value[id];

    if (!expanded.value[id]) return;

    nextTick(() => {
        detailCells(payload)
            .filter((cell) => cell.isSfDump && cell.sfDumpId)
            .forEach((cell) => {
                const el = document.getElementById(`sf-dump-${cell.sfDumpId}`);
                if (el && !el.hasAttribute('has-dump-js')) {
                    el.setAttribute('has-dump-js', 'true');
                    try {
                        window.Sfdump(`sf-dump-${cell.sfDumpId}`);
                    } catch (e) {}
                }
            });
    });
};

const clear = () => {
    if (pauseStore.is_paused) {
        pauseStore.toggle();
    }

    payloadStore.clear(props.screen);
};
</script>

<template>
    <div>
        <div
            v-if="!hideHeader"
            class="flex items-center justify-between w-full h-9 px-3"
        >
            <span class="text-[10px] font-bold uppercase tracking-widest text-base-content/70 select-none">
                {{ title }}
            </span>

            <div class="flex items-center gap-1">
                <div class="dropdown dropdown-bottom dropdown-end">
                    <button
                        tabindex="0"
                        role="button"
                        class="btn btn-ghost btn-circle btn-sm"
                        data-tippy-content="Filter Type"
                    >
                        <FunnelIcon
                            v-if="!isFiltering"
                            class="w-4"
                        />
                        <FunnelSolidIcon
                            v-else
                            class="w-4 text-primary"
                        />
                    </button>

                    <ul
                        tabindex="0"
                        class="p-2 shadow-xl dropdown-content menu bg-base-200/95 backdrop-blur-xl rounded-xl border border-white/5 z-[100] w-52"
                    >
                        <li
                            v-for="(count, label) in typeCounts"
                            :key="label"
                            :class="{ 'text-primary': typeFilter === label }"
                            @click="selectType(String(label))"
                        >
                            <a
                                class="!text-xs"
                                v-text="`${label} (${count})`"
                            ></a>
                        </li>
                    </ul>
                </div>

                <button
                    @click="pauseStore.toggle()"
                    class="btn btn-ghost btn-circle btn-sm"
                    :data-tippy-content="$t('pause')"
                >
                    <PlayIcon
                        v-if="pauseStore.is_paused"
                        class="w-4 text-warning"
                    />
                    <IconPause
                        v-else
                        class="w-4"
                    />
                </button>

                <button
                    v-if="items.length > 0"
                    @click="clear"
                    class="btn btn-ghost btn-circle btn-sm text-error/70 hover:text-error"
                    data-tippy-content="Clear"
                >
                    <TrashIcon class="w-4" />
                </button>
            </div>
        </div>

        <div :class="inScreenWindow ? 'h-[calc(100vh-100px)]' : 'h-[calc(100vh-140px)]'">
            <div
                v-if="items.length > 0"
                class="overflow-auto px-3"
                style="height: -webkit-fill-available"
            >
                <table class="table table-pin-rows">
                    <thead>
                        <tr class="text-xs bg-base-300! font-light text-base-content">
                            <th class="w-[130px]">Type</th>
                            <th>{{ columnLabels[0] }}</th>
                            <th>{{ columnLabels[1] }}</th>
                            <th class="w-[160px]">Origin</th>
                            <th class="w-[80px] text-right">Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        <template
                            v-for="(payloads, timeKey) in groupedByRelativeTime"
                            :key="timeKey"
                        >
                            <tr class="bg-base-200 text-xs font-semibold">
                                <td
                                    colspan="5"
                                    class="select-none text-base-content/60"
                                >
                                    {{ timeKey }}
                                </td>
                            </tr>

                            <template
                                v-for="payload in payloads"
                                :key="payload.id"
                            >
                                <tr
                                    :id="`ld-anchor-${payload.id}`"
                                    @click="toggleExpand(payload)"
                                    class="hover:bg-base-100 cursor-pointer"
                                    :class="{ 'bg-base-300': expanded[payload.id] }"
                                >
                                    <td>
                                        <span
                                            class="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-md whitespace-nowrap"
                                            :class="classesFor(eventLabel(payload)).badge"
                                        >
                                            <span
                                                class="w-1.5 h-1.5 rounded-full"
                                                :class="classesFor(eventLabel(payload)).dot"
                                            ></span>
                                            {{ styleFor(eventLabel(payload)).label }}
                                        </span>
                                    </td>
                                    <td class="font-mono text-xs max-w-0 truncate">
                                        <span :title="primaryCell(payload)">{{ primaryCell(payload) }}</span>
                                    </td>
                                    <td class="font-mono text-xs max-w-0 truncate text-base-content/70">
                                        <span :title="secondaryCell(payload)">{{ secondaryCell(payload) }}</span>
                                    </td>
                                    <td class="text-xs">
                                        <DumpLink
                                            v-if="payload.ide_handle?.real_path"
                                            :ide-handler="payload.ide_handle"
                                            truncate
                                            class="opacity-70 hover:opacity-100"
                                        />
                                        <span
                                            v-else
                                            class="opacity-40"
                                            >—</span
                                        >
                                    </td>
                                    <td class="whitespace-nowrap text-right text-xs opacity-60 font-mono">
                                        <div class="flex items-center justify-end gap-2">
                                            <RelatedJobButton
                                                v-if="payload.related_job"
                                                :related-job="payload.related_job"
                                                :origin-id="payload.id"
                                            />
                                            <span>{{ dayjs(payload.date_time).format('HH:mm:ss') }}</span>
                                        </div>
                                    </td>
                                </tr>

                                <tr
                                    v-if="expanded[payload.id]"
                                    class="bg-base-200/60"
                                >
                                    <td colspan="5">
                                        <div class="space-y-3 py-1 px-1">
                                            <div
                                                v-for="cell in detailCells(payload)"
                                                :key="cell.column"
                                            >
                                                <div
                                                    class="text-[10px] uppercase tracking-widest text-base-content/50 mb-1"
                                                >
                                                    {{ cell.column }}
                                                </div>
                                                <div
                                                    class="text-xs bg-base-100 border border-base-content/10 rounded-lg p-2.5 leading-relaxed"
                                                >
                                                    <VueJsonPretty
                                                        v-if="cell.isJsonPretty"
                                                        :data="cell.jsonData"
                                                        :show-icon="true"
                                                        :show-length="true"
                                                        :show-line="false"
                                                    />
                                                    <pre
                                                        v-else-if="cell.isSfDump"
                                                        :id="`sf-dump-${cell.sfDumpId}`"
                                                        class="sf-dump-debug overflow-auto text-xs break-all whitespace-pre-line"
                                                        data-indent-pad="  "
                                                        v-html="cell.html"
                                                    ></pre>
                                                    <span
                                                        v-else
                                                        class="font-mono break-all"
                                                        >{{ cell.text }}</span
                                                    >
                                                </div>
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
                <SvgEmpty class="w-30 opacity-25" />
                <div class="text-base-content/70">
                    <h1 class="text-lg font-semibold mb-2">Empty</h1>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
@reference "./../../styles.css";

:deep(.table thead) :where(th, td) {
    @apply p-2;
}

:deep(.table tbody) {
    :where(th, td) {
        @apply p-1.5 px-2;
    }
}
</style>
