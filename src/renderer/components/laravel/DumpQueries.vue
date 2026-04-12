<script setup lang="ts">
import { computed, defineProps, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { format } from 'sql-formatter';
import { Payload } from '@/types/Payload';
import { useFormattedQueriesStore } from '@/store/formatted-queries';

import hljs from 'highlight.js/lib/core';
import sql from 'highlight.js/lib/languages/sql';

import { useQueryDuplicated } from '@/store/query-duplicated';
import IconChevronDown from '@/components/Icons/IconChevronDown.vue';
import VueJsonPretty from 'vue-json-pretty';

hljs.registerLanguage('sql', sql);
hljs.registerLanguage('postgresql', sql);

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

const checkContainerHeight = () => {
    if (!codeContainer.value || isManualToggle.value) return;

    void codeContainer.value.offsetHeight;

    const codeHeight = codeContainer.value.offsetHeight;

    showToggleControls.value = codeHeight >= 112;
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

defineExpose({
    openModalForExplainQuery,
    duplicatesStore,
    payload: props.payload
});

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

    let language = 'sql';

    if (props.payload.queries.hasOwnProperty('driver')) {
        const driverMap = {
            pgsql: 'postgresql',
            postgresql: 'postgresql'
        };
        language = driverMap[props.payload.queries.driver] || 'sql';
    }

    if (sql != null) {
        let formattedSql =
            formattedQueriesStore.formatted || props.isPrettified
                ? format(sql, {
                      indent: '    ',
                      language,
                      keywordCase: 'lower',
                      indentStyle: 'standard'
                  })
                : sql;

        return hljs.highlight(formattedSql, { language }).value;
    }
});
</script>

<template>
    <div
        v-if="payload.queries"
        class="rounded-sm"
    >
        <dialog
            ref="modalRef"
            class="modal modal-start rounded-none"
        >
            <div class="modal-box max-w-2xl pl-4! rounded-none">
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
                            class="text-sm!"
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

        <!-- SQL Code without badges (badges moved to metadata line in DumpItem) -->
        <div class="text-left">
            <pre
                v-if="formattedQueriesStore.formatted || isPrettified"
                class="relative group overflow-hidden whitespace-pre-wrap wrap-break-word text-left w-full"
            >
                <code
                    class="language-sql leading-[1.2rem]! text-base-content !text-xs"
                    v-html="formattedSql"
                ></code>
            </pre>
            <div
                v-else
                class="relative break-all"
            >
                <code
                    ref="codeContainer"
                    :class="{ 'is-collapsed': isCollapsed }"
                    class="text-base-content language-sql rounded !text-xs leading-5 block"
                    v-html="formattedSql"
                ></code>

                <div
                    v-if="showToggleControls"
                    class="expand-trigger"
                    :class="{ 'is-collapsed': isCollapsed }"
                    @click="toggleCollapse"
                >
                    <span
                        v-if="isCollapsed"
                        class="expand-fade"
                    ></span>
                    <button class="expand-btn">
                        <IconChevronDown
                            class="w-3 transition-transform duration-200"
                            :class="{ 'rotate-180': !isCollapsed }"
                            stroke-width="2.5"
                        />
                        <span class="text-[10px]">{{ isCollapsed ? 'expand' : 'collapse' }}</span>
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<style>
@reference "./../../styles.css";

code * {
    @apply font-light! text-base-content! tracking-wider;
}

code.is-collapsed {
    max-height: 112px;
    overflow: hidden;
    transition: max-height 0.3s ease;
}

code:not(.is-collapsed) {
    max-height: none;
    transition: max-height 0.3s ease;
}

.expand-trigger {
    @apply w-full flex items-end justify-center cursor-pointer;
    padding-top: 4px;
}

.expand-trigger.is-collapsed {
    position: absolute;
    bottom: 0;
    left: -8px;
    right: -8px;
    height: 56px;
}

.expand-fade {
    @apply absolute inset-0 pointer-events-none -m-6;
}

.expand-btn {
    @apply relative z-10 flex items-center gap-1 text-base-content/40 hover:text-base-content/70 transition-colors duration-150 py-0.5 px-2;
}

.expand-trigger.is-collapsed {
    @apply absolute left-0 right-0;
    bottom: 0;
    height: 56px;
    border-radius: 0 0 4px 4px;
    overflow: hidden;
}

.expand-fade {
    @apply absolute inset-0 pointer-events-none;
    background: linear-gradient(
        to bottom,
        transparent 0%,
        oklch(from var(--color-base-100, #1d232a) l c h / 0.95) 60%,
        oklch(from var(--color-base-100, #1d232a) l c h) 100%
    );
}

.expand-btn {
    @apply relative z-10 flex items-center gap-1 text-base-content/40 hover:text-base-content/70 transition-colors duration-150 py-0.5 px-2;
}
</style>
