<script setup lang="ts">
import { computed, defineProps, ref } from "vue";
import { format } from "sql-formatter";
import { useTimeStore } from "@/store/time";
import { BarsArrowDownIcon, BarsArrowUpIcon } from "@heroicons/vue/20/solid";
import { Payload } from "@/types/Payload";

import hljs from "highlight.js/lib/core";
import sql from "highlight.js/lib/languages/sql";
import CopyToClick from "@/components/CopyToClick.vue";
hljs.registerLanguage("sql", sql);

const formatted = ref(true);
const copied = ref(false);

const timeStore = useTimeStore();

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

<template>
    <div class="rounded-sm dump-queries w-[calc(100vw-180px)]">
        <pre
            v-if="formatted"
            class="flex relative group select-none"
        >
            <code class='language-sql !leading-[1.2rem] text-base-content !text-xs' v-html="formatSql"></code>
        </pre>

        <div v-if="!formatted">
            <code
                class="text-base-content rounded !text-xs select-none"
                v-html="formatSql"
            ></code>
        </div>

        <div class="group items-center mt-1">
            <div class="flex items-center select-none">
                <div
                    class="w-full"
                    v-if="props.payload.screen.screen_name != 'Slow Queries'"
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

                <div class="flex justify-end gap-3 items-center absolute top-0 right-1">
                    <div
                        class="cursor-pointer opacity-0 group-hover:opacity-100"
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
                        class="text-base-content opacity-0 group-hover:opacity-100"
                    />

                    <span class="font-semibold text-sm text-primary"> {{ props.payload.queries.time }} <span class="font-normal text-xs">ms</span></span>
                </div>
            </div>
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

.hljs-number,
.hljs-operator {
    @apply !text-accent;
}

[data-theme="retro"] .hljs-keyword {
    @apply !text-accent;
}
[data-theme="retro"] .hljs-string {
    @apply !text-accent;
}

[data-theme="halloween"] .hljs-keyword {
    @apply !text-primary;
}
[data-theme="halloween"] .hljs-string {
    @apply !text-primary;
}

[data-theme="cyberpunk"] .hljs-keyword {
    @apply !text-primary;
}
[data-theme="cyberpunk"] .hljs-string {
    @apply !text-primary;
}

[data-theme="lemonade"] .hljs-keyword {
    @apply !text-primary;
}
[data-theme="lemonade"] .hljs-string {
    @apply !text-primary;
}
[data-theme="lemonade"] .hljs-number,
.hljs-operator {
    @apply !text-secondary !font-semibold;
}
</style>
