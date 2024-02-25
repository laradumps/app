<template>
    <div class="rounded-sm">
        <pre
            v-if="formatted"
            class="flex relative group select-none"
        >
            <code class='language-sql !leading-4 text-base-content !text-xs' v-html="formatSql"></code>
        </pre>

        <div v-if="!formatted">
            <code
                class="text-base-content rounded !text-xs select-none"
                v-html="formatSql"
            ></code>
        </div>

        <div class="group items-center mt-1">
            <div class="flex items-center select-none">
                <div class="w-full">
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

                <div class="flex justify-end gap-3 items-center opacity-70 absolute top-[15px] right-[15px]">
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

                    <CopyToClick
                        @click="
                            $clipboard(props.payload.queries?.sql);
                            showCopiedBadge();
                        "
                        class="text-base-content"
                    />

                    <span class="font-semibold text-sm badge badge-primary text-primary-content"> {{ props.payload.queries.time }} <span class="font-normal text-xs">ms</span></span>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, defineProps, ref } from "vue";
import { format } from "sql-formatter";
import { useTimeStore } from "@/store/time";
import { usePrivacy } from "@/store/privacy";
import { BarsArrowDownIcon, BarsArrowUpIcon } from "@heroicons/vue/20/solid";
import { ClipboardIcon } from "@heroicons/vue/24/outline";
import { Payload } from "@/types/Payload";

import hljs from "highlight.js/lib/core";
import sql from "highlight.js/lib/languages/sql";
import CopyToClick from "@/components/CopyToClick.vue";
hljs.registerLanguage("sql", sql);

const formatted = ref(false);
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
<style>
.hljs-keyword {
    @apply !text-primary;
}
.hljs-string {
    @apply !text-secondary;
}
</style>
