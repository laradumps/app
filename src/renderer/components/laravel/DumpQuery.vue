<script setup lang="ts">
import { computed, defineProps } from 'vue';
import { format } from 'sql-formatter';

import hljs from 'highlight.js/lib/core';
import sql from 'highlight.js/lib/languages/sql';
hljs.registerLanguage('sql', sql);

interface Query {
    sql: string;
    query: string;
    time: number;
    driver: string;
    connectionName?: string;
}

const props = defineProps<{
    query: Query;
}>();

const formattedSql = computed(() => {
    const sql = props.query.sql ?? props.query.query;

    let language = 'sql';

    if (props.query.hasOwnProperty('driver')) {
        const driverMap = {
            pgsql: 'postgresql',
            postgresql: 'postgresql'
        };

        language = driverMap[props.query.driver] || 'sql';
    }

    if (sql != null) {
        let formattedSql = format(sql, {
            indent: '    ',
            language
        });

        return hljs.highlight(formattedSql, { language }).value;
    }
});
</script>

<template>
    <div class="space-y-2 w-full">
        <div
            :class="{
                'justify-end': !props.query.connectionName
            }"
            class="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400"
        >
            <span v-if="props.query.connectionName">
                {{ props.query.connectionName }}
            </span>
            <span v-if="props.query.time != null"> {{ props.query.time.toFixed(2) }} ms </span>
        </div>
        <code
            ref="codeContainer"
            class="text-base-content language-sql rounded !text-xs leading-5"
            v-html="formattedSql"
        ></code>
    </div>
</template>

<style scoped>
@reference "./../../styles.css";
</style>
