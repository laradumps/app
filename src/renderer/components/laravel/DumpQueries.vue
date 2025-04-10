<script setup lang="ts">
import {computed, defineProps, nextTick, onBeforeUnmount, onMounted, ref} from "vue";
import { format } from "sql-formatter";
import { useTimeStore } from "@/store/time";
import { Payload } from "@/types/Payload";
import { useFormattedQueriesStore } from "@/store/formatted-queries";

import hljs from "highlight.js/lib/core";
import sql from "highlight.js/lib/languages/sql";
import { useQueryDuplicated } from "@/store/query-duplicated";
import IconWarning from "@/components/Icons/IconWarning.vue";
import IconChevronDown from "@/components/Icons/IconChevronDown.vue";

hljs.registerLanguage("sql", sql);
hljs.registerLanguage("postgresql", sql);

const timeStore = useTimeStore();
const formattedQueriesStore = useFormattedQueriesStore();
const duplicatesStore = useQueryDuplicated();

const props = defineProps<{
    payload: Payload;
}>();

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

const total = computed(() => timeStore.requests[props.payload.request_id]?.total ?? 0);

const percentage = computed(() => {
    if (!props.payload.queries) {
        return 0;
    }

    return Number(((100 * props.payload.queries?.time) / total.value).toFixed(2));
});

const isDuplicated = (sql) => {
    return duplicatesStore.duplicatesInfo.some((info) => info.request_id === timeStore.selected && info.sql === sql && info.has_duplicated);
};

const formattedSql = computed(() => {
    if (!props.payload.queries) return;

    const sql = props.payload.queries.sql;

    let language = "sql";

    if (props.payload.queries.hasOwnProperty("driver")) {
        const driverMap = {
            pgsql: "postgresql",
            postgresql: "postgresql"
        };

        language = driverMap[props.payload.queries.driver] || "sql";
    }

    if (sql != null) {
        let formattedSql = formattedQueriesStore.formatted
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
        class="rounded-sm overflow-scroll space-y-3"
    >
        <div class="flex items-center opacity-80 justify-end gap-2">
            <IconWarning
                v-if="isDuplicated(payload.queries?.sql)"
                class="text-warning w-4"
            />

            <span
                v-if="payload.queries && payload.queries.connectionName"
                v-text="payload.queries.connectionName"
            >
            </span>

            <span class="opacity-30">|</span>
            <span
                class="text-xs"
                v-if="payload.queries && payload.queries.origin"
                v-text="payload.queries.origin"
            >
            </span>

            <span class="opacity-30">|</span>

            <span v-if="payload.queries && payload.queries.time"> {{ payload.queries.time }}<span class="font-semibold text-[10px]">ms</span> </span>
        </div>

        <pre
            v-if="formattedQueriesStore.formatted"
            class="flex relative group w-auto overflow-hidden whitespace-pre-wrap break-words"
        >
            <code class='language-sql !leading-[1.2rem] w-auto text-base-content !text-xs' v-html="formattedSql"></code>
        </pre>

        <div class="relative">
            <code
                ref="codeContainer"
                v-if="!formattedQueriesStore.formatted"
                :class="{ 'line-clamp-[14]': isCollapsed }"
                class="text-base-content language-sql rounded !text-xs"
                v-html="formattedSql"
            ></code>

            <span v-if="showToggleControls" class="blur-overlay w-full"></span>

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

        <div class="group items-center mt-1">
            <div class="flex items-center select-none">
                <div
                    class="w-full"
                    v-if="payload.to_screen.screen_name != 'Slow Queries'"
                >
                    <div
                        v-show="percentage <= 100"
                        :title="percentage + `%`"
                        :style="{ width: percentage + '%' }"
                        :class="{
                            'bg-red-500 dark:bg-red-400': percentage > 50,
                            'bg-orange-500': percentage > 20 && percentage < 50,
                            'bg-blue-500': percentage < 20
                        }"
                        class="h-[0.2rem] mt-1 opacity-70 relative"
                    ></div>
                </div>
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
</style>
