<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
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
import DumpGrouped from '@/components/dumps/DumpGrouped.vue';
import { useCollapse } from '@/store/collapse';
import { useSettingsStore } from '@/store/settings';
import dayjs from 'dayjs';
import { useQueriesChart } from '@/store/queries-chart';
import {
    TrashIcon,
    ClipboardIcon,
    BookmarkIcon,
    SparklesIcon,
    ExclamationTriangleIcon,
    BoltIcon
} from '@heroicons/vue/24/outline';
import { useTimeStore } from '@/store/time';
import { useQueryDuplicated } from '@/store/query-duplicated';
import { usePayloadStore } from '@/store/payload';
import VueJsonPretty from 'vue-json-pretty';
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

// Para o modal Explain
const selectedQuery = ref<any[]>([]);

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
    e.stopPropagation();

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
    isFirst?: boolean;
    isPrettified?: boolean;
}>();

watch(
    () => props.isPrettified,
    (newVal) => {
        isPrettified.value = newVal ?? false;
    },
    { immediate: true }
);

const deleteDump = (id: string | null) => {
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

    if (props.payload.dump?.dump && typeof props.payload.dump.dump === 'string' && props.payload.sf_dump_id) {
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
});

watch(collapseStore, (value) => {
    open.value = value.open;
});

const indicatorColorClass = computed(() => {
    const { color } = props.payload;
    const { label } = props.payload.with_label;

    if (['error', 'emergency'].includes(label) || color === 'red')
        return 'border-l-4 border-b-0 bg-error/10 border-error';
    if (label === 'info' || color === 'blue') return 'border-l-4 border-b-0 bg-info/10 border-info';
    if (label === 'warning' || color === 'orange') return 'border-l-4 border-b-0 bg-warning/10 border-warning';
    if (color === 'green') return 'border-l-4 border-b-0 bg-success/10 border-success';

    return 'hover:bg-base-300';
});

const indicatorDotClass = computed(() => {
    const { color } = props.payload;
    const { label } = props.payload.with_label;

    if (['error', 'emergency'].includes(label) || color === 'red') return 'bg-error';
    if (label === 'info' || color === 'blue') return 'bg-info';
    if (label === 'warning' || color === 'orange') return 'bg-warning';
    if (color === 'green') return 'bg-success';

    return 'bg-base-content/20';
});

const hasColorLabel = computed(() => {
    const { color } = props.payload;
    const { label } = props.payload.with_label;
    return !!label || !!color;
});

const getLabel = computed(() => {
    if (Object.values(props.payload.with_label).length > 0 && props.payload.with_label.label !== '') {
        return props.payload.with_label.label;
    }

    return props.payload.type;
});

const titleContent = computed(() => {
    if (props.payload.type === 'model' && props.payload.model?.className) {
        const className = props.payload.model.className;
        const attributes = props.payload.model.attributes?.[0] || '';
        const cleanAttributes = attributes
            .replace(/<[^>]*>?/gm, '')
            .replace(/\s+/g, ' ')
            .trim();

        return `${className} <span class="opacity-50 font-normal ml-2">${cleanAttributes.substring(0, 150)}</span>`;
    }

    if (props.payload.type === 'dump') {
        const dump = props.payload.dump?.dump;
        const type = props.payload.dump?.variable_type;

        if (type === 'string' && dump) {
            // Remove simple HTML tags and clean up for preview
            return dump.replace(/<[^>]*>?/gm, '').substring(0, 100);
        }
        return type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Object';
    }

    return getLabel.value;
});

const openExplainModal = async () => {
    const data = props.payload.queries?.explain_nodes ?? [];

    if (!data.length) return;

    selectedQuery.value = data;

    await nextTick();

    // Use payload.id como fallback se sf_dump_id for null
    const modalId = `explain-modal-${props.payload.sf_dump_id || props.payload.id}`;
    const explainModal = document.getElementById(modalId) as HTMLDialogElement;

    if (explainModal) {
        explainModal.showModal();
    } else {
        console.warn(`Modal with ID ${modalId} not found`);
    }
};

const handleDuplicatedClick = (event: MouseEvent) => {
    if (
        props.payload.type === 'queries' &&
        props.payload.queries?.query?.sql &&
        duplicatesStore.isDuplicated(props.payload.request_id, props.payload.queries.query.sql)
    ) {
        event.stopPropagation();
        duplicatesStore.toggleSelectedSql(props.payload.queries.query.sql);
    }
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
        :class="{ '-mt-1': isFirst && !payload.dump?.variable_name }"
    >
        <div
            @mouseenter="decrementBadgeCount"
            :class="[
                { 'highlight-duplicated': isHighlighted },
                hasColorLabel ? indicatorColorClass : '',
                {
                    'bg-warning/20 border-warning/40':
                        payload.type === 'queries' &&
                        payload.queries?.query?.sql &&
                        duplicatesStore.isDuplicated(payload.request_id, payload.queries.query.sql)
                }
            ]"
            :style="isPercentageColors ? computedBackgroundStyle : {}"
            class="collapse rounded-none group/item border-b border-base-content/10 transition-colors"
            @contextmenu.prevent="onContextMenu($event)"
            @click="
                handleDuplicatedClick($event);
                openOptions = false;
            "
        >
            <div
                @click="open = !open"
                class="collapse-title p-4! min-h-0 flex flex-col gap-5 cursor-default"
            >
                <!-- top row: dot + content + badge -->
                <div class="flex items-start gap-3">
                    <div
                        class="w-2 h-2 rounded-full shrink-0 mt-1.5"
                        :class="indicatorDotClass"
                    ></div>

                    <div class="flex-1 flex flex-col gap-2.5 overflow-hidden">
                        <!-- Header: time + label -->
                        <div
                            v-if="getLabel !== payload.type || !settingsStore.settings.grouped_by_time"
                            class="flex items-center gap-1.5 pt-0.5"
                        >
                            <span
                                v-if="!settingsStore.settings.grouped_by_time"
                                class="font-mono text-[0.65rem] bg-base-300/60 text-base-content/55 px-1.5 py-px rounded border border-base-content/10"
                                >{{ dayjs(payload.date_time).format('HH:mm:ss') }}</span
                            >
                            <span
                                v-if="getLabel !== payload.type"
                                class="text-[10px] px-1.5 py-0.5 rounded bg-base-300 text-base-content/80 whitespace-nowrap"
                                >{{ getLabel }}</span
                            >
                        </div>

                        <!-- Model: ClassName + Raw Attributes HTML -->
                        <DumpModel
                            v-if="payload.type === 'model' && payload.model"
                            :payload="payload"
                        />

                        <!-- Grouped Dump: multiple vars with individual IDE links -->
                        <DumpGrouped
                            v-else-if="payload.type === 'dump_group' && payload.dump_group"
                            :payload="payload"
                        />

                        <!-- Dump: Raw Content HTML -->
                        <div v-else-if="payload.type === 'dump' && payload.dump">
                            <div
                                v-if="(payload.dump.variable_name && payload.dump.variable_name !== 'arg0') || (settingsStore.settings.show_variable_type && payload.dump.variable_type !== undefined)"
                                class="flex items-center gap-1.5 mb-2"
                            >
                                <span
                                    v-if="payload.dump.variable_name && payload.dump.variable_name !== 'arg0'"
                                    class="font-mono text-[0.72rem] font-semibold text-[#9CDCFE]"
                                    >${{ payload.dump.variable_name }}</span
                                >
                                <span
                                    v-if="settingsStore.settings.show_variable_type && payload.dump.variable_type !== undefined"
                                    class="font-mono text-[0.65rem] bg-base-300/60 text-base-content/55 px-1.5 py-px rounded border border-base-content/10"
                                    >{{ payload.dump.variable_type }}</span
                                >
                            </div>
                            <DumpDump :payload="payload" />
                        </div>

                        <!-- Table V2 -->
                        <DumpTableV2
                            v-else-if="payload.type === 'table_v2' && payload.table_v2"
                            :payload="payload"
                        />

                        <!-- Table -->
                        <DumpTable
                            v-else-if="payload.type === 'table' && payload.table"
                            :payload="payload"
                        />

                        <!-- HTML -->
                        <DumpHTML
                            v-else-if="payload.type === 'html'"
                            :payload="payload"
                        />

                        <!-- Time Track -->
                        <DumpTimeTrack
                            v-else-if="payload.type === 'time_track' && payload.time_track"
                            :payload="payload"
                        />

                        <!-- Contains -->
                        <DumpContains
                            v-else-if="payload.type === 'contains' && payload.contains"
                            :payload="payload"
                        />

                        <!-- JSON -->
                        <DumpJson
                            v-else-if="payload.type === 'json' && payload.json"
                            :payload="payload"
                        />

                        <!-- Validate JSON -->
                        <DumpIsJson
                            v-else-if="payload.validate_json"
                            :payload="payload"
                        />

                        <!-- Mailable -->
                        <DumpMailable
                            v-else-if="payload.type === 'mailable' && payload.mailable"
                            :payload="payload"
                        />

                        <!-- Queries -->
                        <div
                            v-else-if="payload.type === 'queries'"
                            @click.stop
                            @dblclick.stop="prettifyQuery"
                            class="w-full"
                        >
                            <DumpQueries
                                :payload="payload"
                                :is-prettified="isPrettified"
                            />
                        </div>

                        <!-- Individual Query -->
                        <div
                            v-else-if="payload.type === 'query'"
                            @click.stop
                            class="w-full"
                        >
                            <DumpQuery :query="payload.query" />
                        </div>

                        <!-- Others -->
                        <div
                            v-else
                            class="font-bold text-sm truncate"
                        >
                            {{ titleContent }}
                        </div>
                    </div>

                    <!-- badge dot: top-right -->
                    <div
                        v-if="open && shouldDisplayBadge"
                        class="bg-warning w-1.5 h-1.5 rounded-full shrink-0 mt-1.5"
                    ></div>
                </div>

                <!-- bottom row: metadata -->
                <div class="flex items-center gap-3 pl-5 text-[0.73rem] font-medium">
                    <div class="hover:opacity-100 transition-opacity">
                        <DumpLink
                            v-if="payload.ide_handle.real_path"
                            :ide-handler="payload.ide_handle"
                            :truncate="true"
                            class="underline p-0!"
                        />
                        <span v-else> Unknown </span>
                    </div>

                    <!-- Query badges (Explain only) -->
                    <div
                        v-if="payload.type === 'queries'"
                        class="flex items-center gap-2 ml-auto"
                    >
                        <span
                            v-if="payload.queries?.query?.connectionName"
                            class="badge badge-ghost badge-xs p-1.5 font-mono opacity-70"
                        >
                            {{ payload.queries.query.connectionName }}
                        </span>
                        <span
                            v-if="payload.queries?.query?.time != null"
                            class="badge badge-ghost badge-xs p-1.5 font-mono"
                        >
                            {{ payload.queries.query.time.toFixed(2) }}ms
                        </span>
                        <button
                            v-if="payload.queries?.explain_nodes && payload.queries.explain_nodes.length > 0"
                            @click.stop="openExplainModal()"
                            class="badge badge-warning hover:opacity-80 badge-xs p-1.5 font-mono"
                            title="This query has problematic nodes in the EXPLAIN plan."
                        >
                            <BoltIcon class="w-3" />
                            <span class="text-xs">Explain</span>
                        </button>
                    </div>
                </div>
            </div>

            <div
                v-show="open"
                class="collapse-content !p-0 px-9 pb-4"
            >
                <div
                    class="relative"
                    :class="{ 'w-full': ['queries', 'table', 'table_v2'].includes(payload.type) }"
                    ref="wrapperRef"
                >
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
                                            deleteDump(payload.id);
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
                                            payloadStore.removePayload(payload.id);
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

        <!-- Explain Modal for Queries (moved outside click handlers) -->
        <dialog
            v-if="payload.type === 'queries'"
            :id="`explain-modal-${payload.sf_dump_id || payload.id}`"
            class="modal"
        >
            <div class="modal-box max-w-2xl">
                <div class="space-y-2 mt-4">
                    <div class="font-semibold">
                        <span class="text-lg">Explain</span>
                    </div>

                    <div class="bg-base-200 shadow rounded-lg p-3">
                        <VueJsonPretty
                            v-if="selectedQuery.length > 0"
                            :show-icon="true"
                            :show-length="true"
                            :show-line="false"
                            :data="selectedQuery"
                            :show-double-quotes="false"
                            class="!text-sm"
                            :deep="6"
                        />
                    </div>
                </div>
            </div>
            <form
                method="dialog"
                class="modal-backdrop"
            >
                <button>close</button>
            </form>
        </dialog>
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

@keyframes blink-warning-border {
    0%,
    100% {
        border-color: rgb(251 191 36);
    }
    50% {
        border-color: transparent;
    }
}

.highlight-duplicated {
    @apply border-2 border-solid border-warning rounded-md shadow-lg;
    animation: blink-warning-border 1s 3;
}
</style>
