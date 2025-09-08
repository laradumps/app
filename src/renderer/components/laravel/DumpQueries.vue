<script setup lang="ts">
import { computed, defineProps, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { format } from "sql-formatter";
import { useTimeStore } from "@/store/time";
import { Payload } from "@/types/Payload";
import { useFormattedQueriesStore } from "@/store/formatted-queries";

import hljs from "highlight.js/lib/core";
import sql from "highlight.js/lib/languages/sql";

import { useQueryDuplicated } from "@/store/query-duplicated";
import { ExclamationTriangleIcon } from "@heroicons/vue/24/outline";
import IconChevronDown from "@/components/Icons/IconChevronDown.vue";
import { BoltIcon } from "@heroicons/vue/24/outline";
import VueJsonPretty from "vue-json-pretty";

hljs.registerLanguage("sql", sql);
hljs.registerLanguage("postgresql", sql);

const timeStore = useTimeStore();
const formattedQueriesStore = useFormattedQueriesStore();
const duplicatesStore = useQueryDuplicated();

const props = defineProps<{
    payload: Payload;
    isPrettified: boolean;
}>();
const modalRef = ref<HTMLDialogElement | null>(null);
const selectedQuery = ref<any[]>([]);
const codeContainer = ref<HTMLElement | null>(null);
const isCollapsed = ref(false);
const showToggleControls = ref(false);
const resizeObserver = ref<ResizeObserver | null>(null);
const isManualToggle = ref(false);

const isHighlighted = computed(() => {
    if (!props.payload.queries?.query.sql || !duplicatesStore.selectedSql) {
        return false;
    }
    return duplicatesStore.selectedSql === props.payload.queries.query.sql;
});

const checkContainerHeight = () => {
    if (!codeContainer.value || isManualToggle.value) return;

    void codeContainer.value.offsetHeight;

    const codeHeight = codeContainer.value.offsetHeight;

    showToggleControls.value = codeHeight >= 224;
    isCollapsed.value = showToggleControls.value;
};

const toggleCollapse = () => {
    isManualToggle.value = true;
    isCollapsed.value = !isCollapsed.value;

    setTimeout(() => {
        isManualToggle.value = false;
    }, 300);
};

const openModalForExplainQuery = async () => {
    const data = props.payload.queries?.explain_nodes ?? [];

    if (!data.length) return;

    selectedQuery.value = data;

    await nextTick();

    modalRef.value?.showModal();
};

onMounted(() => {
    nextTick(() => {
        resizeObserver.value = new ResizeObserver(checkContainerHeight);
        if (codeContainer.value) {
            resizeObserver.value.observe(codeContainer.value);
        }

        checkContainerHeight();
    });
});

onBeforeUnmount(() => {
    if (resizeObserver.value && codeContainer.value) {
        resizeObserver.value.unobserve(codeContainer.value);
    }
});

const formattedSql = computed(() => {
    if (!props.payload.queries) return;

    let sql = props.payload.queries.query.sql;

    let language = "sql";

    if (props.payload.queries.hasOwnProperty("driver")) {
        const driverMap = {
            pgsql: "postgresql",
            postgresql: "postgresql"
        };
        language = driverMap[props.payload.queries.driver] || "sql";
    }

    if (sql != null) {
        let formattedSql = formattedQueriesStore.formatted || props.isPrettified
            ? format(sql, {
                  indent: "    ",
                  language
              })
            : sql;

        return hljs.highlight(formattedSql, { language }).value;
    }
});
</script>

<template>
    <div
        v-if="payload.queries"
        class="rounded-sm space-y-2 p-2"
        :class="{ 'highlight-duplicated': isHighlighted }"
    >
        <dialog
            ref="modalRef"
            class="modal modal-start rounded-none"
        >
            <div class="modal-box max-w-2xl !pl-4 rounded-none">
                <div class="space-y-2 mt-4">
                    <div class="font-semibold">
                        <span class="text-lg">Explain</span>
                    </div>

                    <div class="bg-base-200 shadow rounded-lg p-3">
                        <VueJsonPretty
                            v-if="payload.queries.explain_nodes && payload.queries.explain_nodes.length > 0"
                            :show-icon="true"
                            :show-length="true"
                            :show-line="false"
                            :data="payload.queries.explain_nodes"
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

        <div class="flex justify-end items-center gap-2">
            <div class="flex items-center justify-end gap-2">
                <!-- Explain Query and Duplicated Query Icons -->
                <button
                    v-if="payload.queries.explain_nodes && payload.queries.explain_nodes.length > 0"
                    @click="openModalForExplainQuery()"
                    class="btn btn-soft btn-warning btn-xs"
                    title="This query has problematic nodes in the EXPLAIN plan."
                >
                    <BoltIcon class="w-4" />
                </button>

                <!-- Duplicated Query Icon -->
                <button
                    v-if="duplicatesStore.isDuplicated(payload.request_id, payload.queries?.query.sql)"
                    @click="duplicatesStore.toggleSelectedSql(payload.queries.query.sql)"
                    class="btn btn-soft btn-xs btn-error"
                >
                    <ExclamationTriangleIcon class="w-4" />
                </button>
            </div>
        </div>
        <pre
            v-if="formattedQueriesStore.formatted || isPrettified"
            class="flex relative group w-auto overflow-hidden whitespace-pre-wrap break-words"
        >
            <code
                class="language-sql !leading-[1.2rem] w-auto text-base-content !text-xs"
                v-html="formattedSql"
            ></code>
        </pre>
        <div class="relative break-all flex gap-2 flex-col">
            <code
                ref="codeContainer"
                v-if="!formattedQueriesStore.formatted && !isPrettified"
                :class="{ 'line-clamp-[14]': isCollapsed }"
                class="text-base-content language-sql rounded !text-xs leading-5"
                v-html="formattedSql"
            ></code>

            <span
                v-if="showToggleControls && isCollapsed"
                class="blur-overlay w-full"
            ></span>

            <button
                v-if="showToggleControls"
                class="absolute -bottom-2 z-100 w-full opacity-80 flex items-center justify-center"
                @click="toggleCollapse"
            >
                <IconChevronDown
                    class="w-4"
                    :class="{ 'rotate-180': !isCollapsed }"
                    stroke-width="2.5"
                />
            </button>
        </div>
    </div>
</template>

<style>
@reference "./../../styles.css";

code * {
    @apply !font-light !text-base-content tracking-wider;
}

.blur-overlay {
    @apply absolute h-[40px] blur bg-base-100/90 -bottom-4 right-0 z-40;
}

code.line-clamp-[14] {
    max-height: 224px;
    overflow: hidden;
    transition: max-height 0.3s ease;
}

code:not(.line-clamp-[14]) {
    max-height: none;
    transition: max-height 0.3s ease;
}

@keyframes blink-red-border {
    0%,
    100% {
        border-color: #ef4444; /* red-500 */
    }
    50% {
        border-color: transparent;
    }
}

.highlight-duplicated {
    @apply border border-solid border-error rounded-md shadow-md;
    animation: blink-red-border 1s 3;
}
</style>
