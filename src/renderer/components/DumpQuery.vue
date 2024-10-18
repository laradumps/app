<script setup lang="ts">
import { computed, defineProps, onMounted, ref } from "vue";
import { format } from "sql-formatter";
import { BarsArrowDownIcon, BarsArrowUpIcon } from "@heroicons/vue/20/solid";

import hljs from "highlight.js/lib/core";
import sql from "highlight.js/lib/languages/sql";
hljs.registerLanguage("sql", sql);

const formatted = ref(false);
const copied = ref(false);

const toggleFormatted = () => {
    formatted.value = !formatted.value;
};

const props = defineProps<{
    query: Object;
}>();

const formatSql = computed(() => {
    const sql = props?.query.sql ?? props?.query.query;

    if (sql != null) {
        let formattedSql = formatted.value
            ? format(sql, {
                  indent: "    "
              })
            : sql;

        return hljs.highlight(formattedSql, { language: "sql" }).value;
    }
});

const unformattedSql = computed(() => props.query?.sql);

onMounted(() => {
    formatted.value = props.query.sql != "";
});
</script>

<template>
    <div
        id="dump-query"
        class="space-y-2 w-full"
    >
        <div
            v-show="query.time"
            class="flex group justify-between items-center"
        >
            <div class="flex gap-3.5 items-center">
                <div
                    class="cursor-pointer"
                    @click="toggleFormatted"
                    :title="$t('toggle_format')"
                >
                    <BarsArrowDownIcon
                        class="w-[1.1rem] h-[1.1rem] text-base-content"
                        v-show="!formatted"
                    />
                    <BarsArrowUpIcon
                        class="w-[1.1rem] h-[1.1rem] text-base-content"
                        v-show="formatted"
                    />
                </div>
            </div>

            <span class="font-semibold text-base text-base-content"> {{ query.time }} <span class="font-normal text-xs">ms</span></span>
        </div>

        <pre
            v-if="formatted"
            class="flex relative group whitespace-pre-wrap"
        >
            <code class='!leading-5 !text-xs' v-html="formatSql"></code>
        </pre>

        <code
            v-if="!formatted"
            class="!text-xs"
            v-html="unformattedSql"
        ></code>
    </div>
</template>

<style>
code * {
    @apply !font-light !text-base-content tracking-wider;
}
.hljs-keyword {
    @apply !text-secondary;
}
.hljs-string {
    @apply !text-secondary;
}
</style>
