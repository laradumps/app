<script setup lang="ts">
import { computed, defineProps } from "vue";
import { format } from "sql-formatter";
import { useTimeStore } from "@/store/time";
import { Payload } from "@/types/Payload";
import { useFormattedQueriesStore } from "@/store/formatted-queries";

import hljs from "highlight.js/lib/core";
import sql from "highlight.js/lib/languages/sql";

hljs.registerLanguage("sql", sql);
hljs.registerLanguage("postgresql", sql);

const timeStore = useTimeStore();
const formattedQueriesStore = useFormattedQueriesStore();

const props = defineProps<{
    payload: Payload;
}>();

const total = computed(() => timeStore.requests[props.payload.request_id]?.total ?? 0);

const percentage = computed(() => {
    if (!props.payload.queries) {
        return 0;
    }

    return Number(((100 * props.payload.queries?.time) / total.value).toFixed(2));
});

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
        class="rounded-sm overflow-scroll"
    >
        <div class="flex justify-between items-start">
            <div class="flex-1 min-w-0">
                <pre
                    v-if="formattedQueriesStore.formatted"
                    class="flex relative group w-auto overflow-hidden whitespace-pre-wrap break-words"
                >
                    <code class='language-sql !leading-[1.2rem] w-auto text-base-content !text-xs' v-html="formattedSql"></code>
                </pre>
            </div>
        </div>

        <code
            v-if="!formattedQueriesStore.formatted"
            class="text-base-content language-sql rounded !text-xs break-all"
            v-html="formattedSql"
        ></code>

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

</style>
