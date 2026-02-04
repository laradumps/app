<script setup lang="ts">
import { computed, defineProps, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import DumpLink from '@/components/dumps/DumpLink.vue';
import DumpQueries from '@/components/laravel/DumpQueries.vue';
import DumpJson from '@/components/dumps/DumpJson.vue';
import DumpModel from '@/components/laravel/DumpModel.vue';
import DumpTable from '@/components/dumps/DumpTable.vue';
import DumpHTML from '@/components/dumps/DumpHTML.vue';
import DumpTimeTrack from '@/components/dumps/DumpTimeTrack.vue';
import DumpContains from '@/components/dumps/DumpContains.vue';
import DumpMailable from '@/components/laravel/DumpMailable.vue';
import DumpIsJson from '@/components/dumps/DumpIsJson.vue';
import DumpTableV2 from '@/components/dumps/DumpTableV2.vue';
import DumpQuery from '@/components/laravel/DumpQuery.vue';
import { Payload } from '@/types/Payload';
import DumpDump from '@/components/dumps/DumpDump.vue';
import { useCollapse } from '@/store/collapse';
import { useSettingsStore } from '@/store/settings';
import moment from 'moment';
import { useQueriesChart } from '@/store/queries-chart';
import {
    ExclamationTriangleIcon,
    TrashIcon,
    ClipboardIcon,
    BookmarkIcon,
    SparklesIcon
} from '@heroicons/vue/24/outline';
import { useTimeStore } from '@/store/time';
import { useQueryDuplicated } from '@/store/query-duplicated';
import { usePayloadStore } from '@/store/payload';
import VueJsonPretty from 'vue-json-pretty';
import { BoltIcon } from '@heroicons/vue/20/solid';
import { useSavedDumpsStore } from '@/store/saved-dumps';
import { useToastStore } from '@/store/toast';
import { useI18n } from 'vue-i18n';

const collapseStore = useCollapse();
const payloadStore = usePayloadStore();
const settingsStore = useSettingsStore();
const queriesChart = useQueriesChart();
const timeStore = useTimeStore();
const duplicatesStore = useQueryDuplicated();
const toast = useToastStore();
const { t } = useI18n({ useScope: 'global' });

const emit = defineEmits<{
    (e: 'deleteDump', id: string): void;
}>();

const open = ref(true);
const openOptions = ref(false);
const menuX = ref(0);
const menuY = ref(0);
const selfId = Math.random().toString(36).slice(2);
const showContext = ref(true);
const isPrettified = ref(false);

const savedStore = useSavedDumpsStore();
const isSaved = computed(() => savedStore.exists(props.payload.id));
const inSavedWindow = computed(() => new URLSearchParams(window.location.search).get('screen') === 'saved');

const onSaveDump = () => {
    savedStore.add(props.payload);
    toast.show(t('toast_added_to_saved'), 'success');
};
const onRemoveFromSaved = () => {
    if (inSavedWindow.value) {
        window.ipcRenderer.send('saved-dumps:remove', { id: props.payload.id });
        toast.show(t('toast_removed_successfully'), 'success');
        return;
    }

    savedStore.remove(props.payload.id);
    toast.show(t('toast_removed_successfully'), 'success');
};

const wrapperRef = ref<HTMLElement | null>(null);

const onContextMenu = (e: MouseEvent) => {
    if (['table', 'table_v2'].includes(props.payload.type)) {
        return;
    }

    e.preventDefault();

    window.dispatchEvent(new CustomEvent('ld-context-open', { detail: selfId }));

    menuX.value = e.clientX;
    menuY.value = e.clientY;

    openOptions.value = true;
};

const onKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
        openOptions.value = false;
    }
};

const onOtherContextOpen = (e: Event) => {
    const ce = e as CustomEvent<string>;
    if (ce.detail !== selfId) {
        openOptions.value = false;
    }
};

const props = defineProps<{
    payload: Payload;
    showTime: boolean;
}>();

const deleteDump = (id: string | null) => {
    if (!id) return;

    emit('deleteDump', id);
};

const copyDump = () => {
    nextTick(() => {
        if (props.payload.type === 'queries' && props.payload.queries?.query.sql) {
            navigator.clipboard.writeText(props.payload.queries?.query.sql).then(() => {
                toast.show(t('toast_copied_to_clipboard'), 'success');
            });

            return;
        }

        if (props.payload.dump?.original_content) {
            navigator.clipboard.writeText(props.payload.dump?.original_content).then(() => {
                toast.show(t('toast_copied_to_clipboard'), 'success');
            });
            return;
        }

        if (props.payload.json?.original_content) {
            navigator.clipboard.writeText(props.payload.json?.original_content).then(() => {
                toast.show(t('toast_copied_to_clipboard'), 'success');
            });
            return;
        }

        const value = document.getElementById(`dump-content-${props.payload.sf_dump_id}`)?.innerText;

        navigator.clipboard.writeText(value).then(() => {
            toast.show(t('toast_copied_to_clipboard'), 'success');
        });
    });
};

const prettifyQuery = () => {
    isPrettified.value = !isPrettified.value;
};

const onGlobalClick = () => {
    openOptions.value = false;
};

onMounted(() => {
    window.addEventListener('keydown', onKeydown);
    window.addEventListener('ld-context-open', onOtherContextOpen as EventListener);
    window.addEventListener('click', onGlobalClick, { capture: true });
    if (props.payload.dump?.dump) {
        const { dump } = props.payload.dump;

        if (typeof dump === 'string' && props.payload.sf_dump_id) {
            const sfDump = document.getElementById(`sf-dump-${props.payload.sf_dump_id}`);

            if (sfDump && !sfDump?.hasAttribute('has-dump-js')) {
                sfDump?.setAttribute('has-dump-js', 'true');
                window.Sfdump(`sf-dump-${props.payload.sf_dump_id}`);
            }
        }

        if (
            props.payload.show_badge_count &&
            props.payload.to_screen.screen_name === 'home' &&
            settingsStore.settings.show_badge_count
        ) {
            window.ipcRenderer.send('badge-icon.increment');
        }
    }
});

const badgeClasses = computed(() => {
    const { color } = props.payload;
    const { label } = props.payload.with_label;

    const baseClass =
        'badge uppercase font-semibold text-xs text-base-content/80 bg-base-content/10 shadow-sm rounded-box w-auto';

    const dynamicClass = {
        '!bg-error !text-error-content': ['error', 'emergency'].includes(label) || color === 'red',
        '!bg-info !text-info-content': label === 'info' || color === 'blue',
        '!bg-warning !text-warning-content': label === 'warning' || color === 'orange',
        '!bg-gray-400! text-warning-content': label === 'debug',
        '!bg-success !text-success-content': color === 'green',
        '!bg-black !text-white': color === 'black'
    };

    const additionalClasses = Object.entries(dynamicClass)
        .filter(([_, condition]) => condition)
        .map(([className]) => className)
        .join(' ');

    return `${baseClass} ${additionalClasses}`;
});

const containerClasses = computed(() => {
    const color = props.payload.color ?? 'default';

    const colors = {
        red: 'bg-error/10',
        blue: 'bg-info/10',
        orange: 'bg-warning/10',
        green: 'bg-success/10',
        black: 'bg-black/10',
        gray: 'bg-base-100',
        default: 'bg-base-100'
    };

    return colors[color];
});

watch(collapseStore, (value) => {
    open.value = value.open;
});

const getLabel = computed(() => {
    if (Object.values(props.payload.with_label).length > 0 && props.payload.with_label.label !== '') {
        return props.payload.with_label.label;
    }

    return props.payload.type;
});

const isDuplicated = (sql: string) => {
    return duplicatesStore.duplicatesInfo.some(
        (info) => info.request_id === timeStore.selected && info.sql === sql && info.has_duplicated
    );
};

const decrementBadgeCount = () => {
    if (shouldDisplayBadge) {
        window.ipcRenderer.send('badge-icon.decrement');

        payloadStore.updatePayload(props.payload, 'show_badge_count', () => false);
        return;
    }
};

const shouldDisplayBadge = computed(() => {
    return (
        props.payload.show_badge_count &&
        props.payload.to_screen.screen_name === 'home' &&
        settingsStore.settings.show_badge_count
    );
});

const hasContext = computed(() => {
    if (props.payload.context?.context) {
        return Object.keys(props.payload.context.context).length > 0;
    }

    if (props.payload.extra && props.payload.extra.context) {
        return Object.keys(props.payload.extra.context).length > 0;
    }

    return false;
});

const getContextPayload = computed(() => {
    if (props.payload.context?.context) {
        return props.payload.context.context;
    }

    if (props.payload.extra && props.payload.extra.context) {
        return props.payload.extra.context;
    }

    return {};
});

const shouldDisplayContext = computed(() => {
    return settingsStore.settings.show_context && hasContext.value;
});

const total = computed(() => timeStore.requests[props.payload.request_id]?.total ?? 0);

const percentage = computed(() => {
    if (!props.payload.queries) {
        return 0;
    }
    return Number(((100 * props.payload.queries?.query.time) / total.value).toFixed(2));
});

const startPercentage = computed(() => {
    const queries = timeStore.requests[props.payload.request_id]?.queries ?? [];
    const index = queries.findIndex((q) => q.query.sql === props.payload.queries.query.sql);

    if (index === -1) return 0;

    return queries.slice(0, index).reduce((sum, q) => {
        return sum + (q.query.time / total.value) * 100;
    }, 0);
});

const endPercentage = computed(() => {
    return startPercentage.value + percentage.value;
});

const getPercentageColors = () => {
    if (percentage.value > 50) {
        return {
            start: 'rgba(239, 68, 68, 0.1)',
            end: 'rgba(239, 68, 68, 0.1)'
        };
    }
    if (percentage.value > 20) {
        return {
            start: 'rgba(245, 158, 11, 0.1)',
            end: 'rgba(245, 158, 11, 0.2)'
        };
    }
    return {
        start: 'rgba(106, 157, 239, 0.1)',
        end: 'rgba(106, 157, 239, 0.2)'
    };
};

const computedBackgroundStyle = computed(() => {
    const colors = getPercentageColors();

    const start =
        typeof startPercentage === 'object' && 'value' in startPercentage ? startPercentage.value : startPercentage;
    const end = typeof endPercentage === 'object' && 'value' in endPercentage ? endPercentage.value : endPercentage;

    return {
        background: `linear-gradient(to right,
      ${colors.start} ${start}%,
      ${colors.end} ${end}%,
      transparent ${end}%)`
    };
});

const isPercentageColors = computed(() => {
    return props.payload.type == 'queries' && queriesChart.type === 'percentage-colors';
});

const isHighlighted = computed(() => {
    if (!props.payload.queries?.query.sql || !duplicatesStore.selectedSql) {
        return false;
    }
    return duplicatesStore.selectedSql === props.payload.queries.query.sql;
});

onUnmounted(() => {
    window.removeEventListener('keydown', onKeydown);
    window.removeEventListener('ld-context-open', onOtherContextOpen as EventListener);
    window.removeEventListener('click', onGlobalClick, { capture: true } as any);
});
</script>
<template>
    <div
        v-if="
            (payload.queries && ['none', 'percentage-colors'].includes(queriesChart.type)) || payload.type !== 'queries'
        "
    >
        <div
            @mouseenter="decrementBadgeCount"
            :class="{
                'border border-base-content/5': isPercentageColors,
                'collapse-open': open,
                'highlight-duplicated': isHighlighted,
                [containerClasses]: true
            }"
            class="border-base-300 collapse rounded-none"
            :style="isPercentageColors ? computedBackgroundStyle : null"
            @contextmenu.prevent="onContextMenu($event)"
            @click="openOptions = false"
        >
            <div
                @click="open = !open"
                class="collapse-title items-center justify-between flex text-xs select-none"
            >
                <ul
                    class="flex items-center gap-5 whitespace-nowrap"
                    v-bind:style="payload.ide_handle?.real_path && showTime ? 'list-style-type: disc;' : ''"
                >
                    <li
                        class="list-none opacity-70"
                        v-if="showTime"
                    >
                        {{ moment(payload.date_time).format('hh:mm:ss a') }}
                    </li>
                    <li class="select-none opacity-70 truncate max-w-[400px]">
                        <DumpLink
                            v-if="payload.ide_handle.real_path"
                            :ide-handler="payload.ide_handle"
                            :truncate="true"
                        />
                        <span v-else> Unknown </span>
                    </li>
                </ul>

                <div class="group flex justify-center items-center gap-2">
                    <div
                        v-show="open"
                        class="flex justify-center items-center gap-3"
                    >
                        <span
                            class="text-sm"
                            v-if="payload.queries && payload.queries.query.time"
                        >
                            {{ payload.queries.query.time }}<span class="font-semibold text-xs">ms</span></span
                        >
                    </div>

                    <div v-show="!open && payload.queries">
                        <div class="flex items-center opacity-80 justify-end gap-2">
                            <BoltIcon
                                v-if="payload.queries?.explain_nodes && payload.queries?.explain_nodes.length > 0"
                                class="w-4 text-warning"
                                title="This query has problematic nodes in the EXPLAIN plan."
                            />

                            <ExclamationTriangleIcon
                                v-if="isDuplicated(payload.queries?.query.sql)"
                                class="text-warning w-4"
                            />

                            <span
                                class="text-sm"
                                v-if="payload.queries && payload.queries.query.time"
                            >
                                {{ payload.queries.query.time }}<span class="font-semibold text-xs">ms</span></span
                            >
                        </div>
                    </div>

                    <div
                        v-show="open && shouldDisplayBadge"
                        class="relative items-center"
                    >
                        <div class="group:opacity-100 bg-warning w-2 h-2 rounded-full absolute"></div>
                        <div class="group:opacity-100 bg-warning w-2 h-2 animate-ping rounded-full"></div>
                    </div>

                    <!-- variable type -->
                    <div
                        v-show="settingsStore.settings.show_variable_type && payload.dump?.variable_type !== undefined"
                        class="text-[0.70rem] opacity-70"
                        v-text="`(${payload.dump?.variable_type})`"
                    ></div>

                    <!-- dump type -->
                    <div
                        class="-mr-1 !text-[0.68rem] p-2.5 !font-semibold"
                        v-if="payload.type !== `queries`"
                        :class="badgeClasses"
                    >
                        {{ getLabel }}
                    </div>
                </div>
            </div>

            <div class="collapse-content">
                <div
                    class="relative"
                    :class="{ 'w-full': ['queries', 'table', 'table_v2'].includes(payload.type) }"
                    ref="wrapperRef"
                >
                    <DumpDump
                        :id="`dump-content-${payload.sf_dump_id}`"
                        class="text-base-content break-all"
                        v-if="payload.type === `dump`"
                        :payload="payload"
                    />

                    <DumpModel
                        :id="`dump-content-${payload.sf_dump_id}`"
                        class="text-base-content break-all"
                        v-if="payload.type === `model`"
                        :payload="payload"
                    />

                    <DumpTimeTrack
                        :id="`dump-content-${payload.sf_dump_id}`"
                        v-if="payload.type === `time_track`"
                        :payload="payload"
                    />

                    <!-- dump mailable -->
                    <DumpMailable
                        :id="`dump-content-${payload.sf_dump_id}`"
                        v-if="payload.type === `mailable`"
                        :payload="payload"
                    />

                    <!-- dump html -->
                    <DumpHTML
                        :id="`dump-content-${payload.sf_dump_id}`"
                        v-if="payload.type === `html`"
                        :payload="payload"
                    />

                    <!-- dump table -->
                    <DumpTable
                        :id="`dump-content-${payload.sf_dump_id}`"
                        class="w-full"
                        v-if="payload.type === `table`"
                        :payload="payload"
                    />

                    <!-- dump table v2 -->
                    <DumpTableV2
                        :id="`dump-content-${payload.sf_dump_id}`"
                        class="w-full"
                        v-if="['table_v2', 'http_client'].includes(payload.type)"
                        :payload="payload"
                    />

                    <!-- dump model -->
                    <DumpJson
                        :id="`dump-content-${payload.sf_dump_id}`"
                        class="w-full"
                        v-if="payload.type === `json`"
                        :payload="payload"
                    />

                    <!-- dump queries -->
                    <DumpQueries
                        :id="`dump-content-${payload.sf_dump_id}`"
                        class="w-full"
                        v-if="payload.type === `queries`"
                        :payload="payload"
                        :is-prettified="isPrettified"
                    />

                    <!-- dump query -->
                    <DumpQuery
                        :id="`dump-content-${payload.sf_dump_id}`"
                        v-if="payload.type === `query`"
                        :query="payload.query"
                    />

                    <DumpContains
                        :id="`dump-content-${payload.sf_dump_id}`"
                        :payload="payload"
                    />

                    <DumpIsJson
                        :id="`dump-content-${payload.sf_dump_id}`"
                        :payload="payload"
                    />

                    <div
                        v-if="showContext && hasContext && shouldDisplayContext"
                        class="mt-3 flex justify-center flex-col !text-xs space-y-3 bg-base-200 p-4 rounded-md"
                    >
                        <div class="text-center uppercase opacity-80 select-none">Context</div>

                        <VueJsonPretty
                            :show-icon="false"
                            :show-length="true"
                            :show-line="false"
                            :data="getContextPayload"
                            :show-double-quotes="true"
                            class="!text-sm"
                            :deep="4"
                        />
                    </div>

                    <!-- Context menu -->
                    <teleport to="#context-menu-portal">
                        <div
                            v-if="openOptions && !['table', 'table_v2'].includes(payload.type)"
                            class="fixed z-[99999] bg-base-200 text-base-content rounded-md shadow-lg border border-base-content/10"
                            :style="{ left: menuX + 'px', top: menuY + 'px' }"
                            @click.stop
                        >
                            <ul class="menu menu-compact p-1 text-xs min-w-38">
                                <li>
                                    <button
                                        class="hover:bg-base-300 rounded flex justify-between items-center"
                                        @click.stop="
                                            copyDump();
                                            openOptions = false;
                                        "
                                    >
                                        {{ $t('copy') }}
                                        <ClipboardIcon class="w-4 inline-block" />
                                    </button>
                                </li>
                                <li v-if="payload.type === 'queries'">
                                    <button
                                        class="hover:bg-base-300 rounded flex justify-between items-center"
                                        @click.stop="
                                            prettifyQuery();
                                            openOptions = false;
                                        "
                                    >
                                        Prettify
                                        <SparklesIcon class="w-4 inline-block" />
                                    </button>
                                </li>
                                <li v-if="inSavedWindow">
                                    <button
                                        class="hover:bg-base-300 rounded flex justify-between items-center"
                                        @click.stop="
                                            onRemoveFromSaved();
                                            openOptions = false;
                                        "
                                    >
                                        {{ $t('remove_from_saved') }}
                                        <BookmarkIcon class="w-4 inline-block" />
                                    </button>
                                </li>
                                <li v-else>
                                    <button
                                        class="hover:bg-base-300 rounded flex justify-between items-center"
                                        @click.stop="
                                            isSaved
                                                ? (onRemoveFromSaved(), (openOptions = false))
                                                : (onSaveDump(), (openOptions = false))
                                        "
                                    >
                                        {{ isSaved ? $t('remove_from_saved') : $t('save_dump') }}
                                        <BookmarkIcon class="w-4 inline-block" />
                                    </button>
                                </li>
                                <li v-if="!inSavedWindow">
                                    <button
                                        class="hover:bg-base-300 rounded flex justify-between items-center"
                                        @click.stop="
                                            deleteDump(payload.id);
                                            openOptions = false;
                                        "
                                    >
                                        {{ $t('delete') }}
                                        <TrashIcon class="w-4 inline-block" />
                                    </button>
                                </li>
                            </ul>
                        </div>
                    </teleport>
                </div>
            </div>
        </div>
    </div>
</template>
<style>
@reference "./../../styles.css";

.card {
    display: grid !important;
}

.vjs-carets {
    @apply opacity-60 pr-1 top-2;
}

.vjs-tree-brackets {
    @apply !opacity-60;
}

.vjs-indent-unit {
    @apply !w-6;
}

.vjs-tree {
    @apply !text-xs;
}

.vjs-key {
    @apply !text-xs;
}

.vjs-value-string {
    @apply !text-primary !text-xs;
}

.vjs-comment {
    @apply !text-xs;
}

@keyframes blink-red-border {
    0%,
    100% {
        border-color: var(--color-error);
    }
    50% {
        border-color: transparent;
    }
}

.highlight-duplicated {
    @apply border-2 border-solid border-error/40 bg-error/5 rounded-md shadow-lg;
    animation: blink-red-border 1s 3;
}
</style>
