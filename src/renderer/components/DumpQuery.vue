<template>
    <div class="space-y-2 rounded-sm">
        <div class="flex group justify-between items-center">
            <div class="flex gap-3.5 items-center">
                <div
                    class="cursor-pointer"
                    @click="toggleFormatted"
                    :title="$t('toggle_format')"
                >
                    <BarsArrowDownIcon
                        class="w-[1.1rem] h-[1.1rem] text-base-500 dark:text-base-300 hover:text-base-800 dark:hover:text-yellow-400"
                        v-show="!formatted"
                    />
                    <BarsArrowUpIcon
                        class="w-[1.1rem] h-[1.1rem] text-base-500 dark:text-base-300 hover:text-base-800 dark:hover:text-yellow-400"
                        v-show="formatted"
                    />
                </div>

                <div
                    class="cursor-pointer"
                    :title="$t('click_to_copy')"
                    @click="
                        $clipboard(props.payload.query?.sql);
                        showCopiedBadge();
                    "
                >
                    <ClipboardIcon class="w-[1.1rem] h-[1.1rem] text-base-700 dark:text-base-400 hover:text-base-800 dark:hover:text-yellow-400" />
                </div>

                <div
                    v-show="copied"
                    class="bg-green-600 dark:bg-green-700 p-0.5 px-1.5 text-xs rounded text-white transition-all ease-out duration-300"
                >
                    {{ $t("copied") }} !
                </div>
            </div>
        </div>

        <pre
            v-if="formatted"
            class="flex relative group pt-3 select-none"
        >
            <code class='language-sql widgets-sql !text-sm dark:text-base-400' v-html="formatSql"></code>
        </pre>

        <div
            v-if="!formatted"
            class="pt-3"
        >
            <code
                class="widgets-sql !text-sm dark:text-base-300 select-none"
                v-html="formatSql"
            ></code>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, defineProps, onMounted, ref } from "vue";
import { format } from "sql-formatter";
import { BarsArrowDownIcon, BarsArrowUpIcon } from "@heroicons/vue/20/solid";
import { ClipboardIcon } from "@heroicons/vue/24/outline";
import { Payload } from "@/types/Payload";

import hljs from "highlight.js/lib/core";
import sql from "highlight.js/lib/languages/sql";
hljs.registerLanguage("sql", sql);

const formatted = ref(false);
const copied = ref(false);

const showCopiedBadge = () => {
    copied.value = true;
    setTimeout(() => copied.value = false, 2000);
};

const toggleFormatted = () => {
    formatted.value = !formatted.value;
};

const props = defineProps<{
    payload: Payload;
}>();

const formatSql = computed(() => {
    const sql = props.payload.query?.sql;
    if (sql != null) {
        let formattedSql = formatted.value
            ? format(sql, {
                  indent: "    "
              })
            : sql;

        return hljs.highlight(formattedSql, { language: "sql" }).value;
    }
});
</script>
