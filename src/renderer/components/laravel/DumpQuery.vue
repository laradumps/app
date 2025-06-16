<script setup lang="ts">
import { computed, defineProps } from "vue";
import { format } from "sql-formatter";

import hljs from "highlight.js/lib/core";
import sql from "highlight.js/lib/languages/sql";
hljs.registerLanguage("sql", sql);

interface Query {
    sql: string;
    query: string;
    time: number;
    driver: string;
}

const props = defineProps<{
    query: Query;
}>();

const formattedSql = computed(() => {
    const sql = props.query.sql ?? props.query.query;

    let language = "sql";

    if (props.query.hasOwnProperty("driver")) {
        const driverMap = {
            pgsql: "postgresql",
            postgresql: "postgresql"
        };

        language = driverMap[props.query.driver] || "sql";
    }

    if (sql != null) {
        let formattedSql = format(sql, {
            indent: "    ",
            language
        });

        return hljs.highlight(formattedSql, { language }).value;
    }
});
</script>

<template>
    <div class="space-y-2 w-full">
        <pre class="flex relative group select-none w-auto overflow-hidden whitespace-pre-wrap break-words">
            <code class='language-sql !leading-[1.2rem] w-auto text-base-content !text-xs' v-html="formattedSql"></code>
        </pre>
    </div>
</template>

<style scoped>
@reference "./../../styles.css";
</style>
