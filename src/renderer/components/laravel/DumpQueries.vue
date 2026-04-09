<script setup lang="ts">
import { computed, defineProps, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { format } from 'sql-formatter';
import { useTimeStore } from '@/store/time';
import { Payload } from '@/types/Payload';
import { useFormattedQueriesStore } from '@/store/formatted-queries';

import hljs from 'highlight.js/lib/core';
import sql from 'highlight.js/lib/languages/sql';

import { useQueryDuplicated } from '@/store/query-duplicated';
import { ExclamationTriangleIcon } from '@heroicons/vue/24/outline';
import IconChevronDown from '@/components/Icons/IconChevronDown.vue';
import { BoltIcon } from '@heroicons/vue/24/outline';
import VueJsonPretty from 'vue-json-pretty';

hljs.registerLanguage('sql', sql);
hljs.registerLanguage('postgresql', sql);

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
        class="rounded-sm"
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

        <!-- SQL Code without badges (badges moved to metadata line in DumpItem) -->
        <div>
            <pre
                v-if="formattedQueriesStore.formatted || isPrettified"
                class="relative group overflow-hidden whitespace-pre-wrap break-words"
            >
                <code
                    class="language-sql !leading-[1.2rem] text-base-content !text-xs"
                    v-html="formattedSql"
                ></code>
            </pre>
            <div
                v-else
                class="relative break-all"
            >
                <code
                    ref="codeContainer"
                    :class="{ 'line-clamp-[14]': isCollapsed }"
                    class="text-base-content language-sql rounded !text-xs leading-5 block"
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
</style>
