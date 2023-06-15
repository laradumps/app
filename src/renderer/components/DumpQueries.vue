<template>
    <div class="space-y-2 rounded-sm">
        <div
            v-show="percentage <= 100"
            :title="percentage + `%`"
            :style="{ width: percentage + '%' }"
            :class="{
                'bg-red-500 dark:bg-red-400': percentage > 50,
                'bg-orange-500': percentage > 20 && percentage < 50,
                'bg-blue-500': percentage < 20
            }"
            class="h-[0.2rem] opacity-70 relative"
        ></div>

        <div class="flex group justify-between items-center">
            <div class="flex gap-3.5 items-center">
                <div
                    class="cursor-pointer"
                    @click="toggleFormatted"
                    :title="$t('toggle_format')"
                >
                    <BarsArrowDownIcon
                        class="w-[1.1rem] h-[1.1rem] text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:hover:text-yellow-400"
                        v-show="!formatted"
                    />
                    <BarsArrowUpIcon
                        class="w-[1.1rem] h-[1.1rem] text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:hover:text-yellow-400"
                        v-show="formatted"
                    />
                </div>

                <div
                    class="cursor-pointer"
                    @click="toggleDetails"
                    :title="$t('show_details')"
                >
                    <EyeIcon
                        class="w-[1.1rem] h-[1.1rem] text-slate-400 hover:text-slate-800 dark:hover:text-yellow-400"
                        v-show="showDetails"
                    />
                    <EyeSlashIcon
                        class="w-[1.1rem] h-[1.1rem] text-slate-400 hover:text-slate-800 dark:hover:text-yellow-400"
                        v-show="!showDetails"
                    />
                </div>

                <div
                    class="cursor-pointer"
                    :title="$t('click_to_copy')"
                    @click="
                        $clipboard(props.payload.queries?.sql);
                        showCopiedBadge();
                    "
                >
                    <ClipboardIcon class="w-[1.1rem] h-[1.1rem] text-slate-700 dark:text-slate-400 hover:text-slate-800 dark:hover:text-yellow-400" />
                </div>

                <div
                    v-show="copied"
                    class="bg-green-600 dark:bg-green-700 p-1 px-1.5 text-xs rounded text-white transition-all ease-out duration-300"
                >
                    {{ $t("copied") }} !
                </div>

                <div
                    v-show="privacyStore.isOpen"
                    class="text-xs select-none text-slate-500 dark:text-slate-400 hidden"
                    :class="{
                        '!block': showDetails
                    }"
                >
                    <span>connection/database</span> |
                    <span class="text-xs text-slate-500 dark:text-slate-400 font-bold">
                        {{ props.payload.queries.connectionName + "/" + props.payload.queries.database }}
                    </span>
                </div>
            </div>

            <div class="justify-end flex gap-4 items-center select-none">
                <span class="text-base font-bold text-slate-600 dark:text-slate-200"> {{ props.payload.queries.time }} <span class="text-xs font-normal">ms</span></span>
            </div>
        </div>

        <pre
            v-if="formatted"
            class="flex relative group pt-3 select-none"
        >
            <code class='language-sql widgets-sql !text-sm dark:text-slate-300' v-html="formatSql"></code>
        </pre>

        <div
            v-if="!formatted"
            class="pt-3"
        >
            <code
                class="widgets-sql !text-sm dark:text-slate-300 select-none"
                v-html="formatSql"
            ></code>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, defineProps, ref } from "vue";
import { format } from "sql-formatter";
import { useTimeStore } from "@/store/time";
import { usePrivacy } from "@/store/privacy";
import { EyeIcon, EyeSlashIcon, BarsArrowDownIcon, BarsArrowUpIcon } from "@heroicons/vue/20/solid";
import { ClipboardIcon } from "@heroicons/vue/24/outline";
import { Payload } from "@/types/Payload";

import hljs from "highlight.js/lib/core";
import sql from "highlight.js/lib/languages/sql";
hljs.registerLanguage("sql", sql);

const formatted = ref(false);
const showDetails = ref(false);
const copied = ref(false);

const timeStore = useTimeStore();
const privacyStore = usePrivacy();

const showCopiedBadge = () => {
    copied.value = true;
    setTimeout(() => {
        copied.value = false;
    }, 2000);
};

const toggleFormatted = () => {
    formatted.value = !formatted.value;
};

const toggleDetails = () => {
    showDetails.value = !showDetails.value;
};

const props = defineProps<{
    payload: Payload;
}>();

const total = computed(() => timeStore.requests[props.payload.request_id]?.total ?? 0);
const percentage = computed(() => ((100 * props.payload.queries?.time) / total.value).toFixed(2));
const formatSql = computed(() => {
    const sql = props.payload.queries?.sql;

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
