<script setup lang="ts">
import { computed, defineProps, onMounted, ref } from "vue";
import { format } from "sql-formatter";
import { BarsArrowDownIcon, BarsArrowUpIcon } from "@heroicons/vue/20/solid";
import { ClipboardIcon } from "@heroicons/vue/24/outline";

import hljs from "highlight.js/lib/core";
import sql from "highlight.js/lib/languages/sql";
import CopyToClick from "@/components/CopyToClick.vue";
hljs.registerLanguage("sql", sql);

const formatted = ref(false);
const copied = ref(false);

const showCopiedBadge = () => {
    copied.value = true;
    setTimeout(() => (copied.value = false), 2000);
};

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

onMounted(() => {
    formatted.value = props.query.sql != ''
})
</script>

<template>
    <div
        id="dump-query"
        class="space-y-2 w-full"
    >
        <div v-show="query.time" class="flex group justify-between items-center">
            <div  class="flex gap-3.5 items-center">
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

            <span class="font-semibold text-sm text-base-content"> {{ query.time }} <span class="font-normal text-xs">ms</span></span>
        </div>

        <pre
            v-if="formatted"
            class="flex relative group whitespace-pre-wrap"
        >
            <code class='!leading-5 !text-xs' v-html="formatSql"></code>
        </pre>

        <div v-if="!formatted">
            <code
                class="!text-xs"
                v-html="formatSql"
            ></code>
        </div>
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
