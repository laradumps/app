<script setup lang="ts">
import { computed, defineProps, nextTick, onMounted, ref, watch } from "vue";
import DumpLink from "@/components/DumpLink.vue";
import DumpQueries from "@/components/laravel/DumpQueries.vue";
import DumpJson from "@/components/DumpJson.vue";
import DumpModel from "@/components/DumpModel.vue";
import DumpTable from "@/components/DumpTable.vue";
import DumpHTML from "@/components/DumpHTML.vue";
import DumpTimeTrack from "@/components/DumpTimeTrack.vue";
import DumpContains from "@/components/DumpContains.vue";
import DumpMailable from "@/components/DumpMailable.vue";
import DumpIsJson from "@/components/DumpIsJson.vue";
import DumpTableV2 from "@/components/DumpTableV2.vue";
import DumpQuery from "@/components/DumpQuery.vue";
import { Payload } from "@/types/Payload";
import CopyToClick from "@/components/CopyToClick.vue";
import DumpDump from "@/components/DumpDump.vue";
import { useCollapse } from "@/store/collapse";
import { useSettingsStore } from "@/store/settings";
import moment from "moment";
import { useScreenStore } from "@/store/screen";
import { LockClosedIcon } from "@heroicons/vue/20/solid";
import { useQueriesBlockedStore } from "@/store/queries-blocked";
import { useQueriesChart } from "@/store/queries-chart";
import IconWarning from "@/components/Icons/IconWarning.vue";
import { useTimeStore } from "@/store/time";
import { useQueryDuplicated } from "@/store/query-duplicated";
import { usePayloadStore } from "@/store/payload";
import VueJsonPretty from "vue-json-pretty";

const collapseStore = useCollapse();
const payloadStore = usePayloadStore();
const settingsStore = useSettingsStore();
const screenStore = useScreenStore();
const queriesBlockedStore = useQueriesBlockedStore();
const queriesChart = useQueriesChart();
const timeStore = useTimeStore();
const duplicatesStore = useQueryDuplicated();

const open = ref(true);
const openOptions = ref(false);
const showContext = ref(true);

const props = defineProps<{
    payload: Payload;
}>();

const copyDump = () => {
    nextTick(() => {
        if (props.payload.type === "queries" && props.payload.queries?.sql) {
            navigator.clipboard.writeText(props.payload.queries?.sql).then(() => {});

            return;
        }

        if (props.payload.dump?.original_content) {
            navigator.clipboard.writeText(props.payload.dump?.original_content).then(() => {});
            return;
        }

        const value = document.getElementById(`dump-content-${props.payload.sf_dump_id}`)?.innerText;

        navigator.clipboard.writeText(value).then(() => {});
    });
};

onMounted(() => {
    if (props.payload.dump?.dump) {
        const { dump } = props.payload.dump;

        if (typeof dump === "string" && props.payload.sf_dump_id) {
            const sfDump = document.getElementById(`sf-dump-${props.payload.sf_dump_id}`);

            if (sfDump && !sfDump?.hasAttribute("has-dump-js")) {
                sfDump?.setAttribute("has-dump-js", "true");
                window.Sfdump(`sf-dump-${props.payload.sf_dump_id}`);
            }
        }

        if (props.payload.show_badge_count && props.payload.to_screen.screen_name === "home" && settingsStore.settings.show_badge_count) {
            window.ipcRenderer.send("badge-icon.increment");
        }
    }
});

const badgeClasses = computed(() => {
    const { color } = props.payload;
    const { label } = props.payload.with_label;

    const baseClass = "badge uppercase font-semibold text-xs text-base-content/80 bg-base-content/10 shadow-sm rounded-box w-auto";

    const dynamicClass = {
        "!bg-error !text-error-content": ["error", "emergency"].includes(label) || color === "red",
        "!bg-info !text-info-content": label === "info" || color === "blue",
        "!bg-warning !text-warning-content": label === "warning" || color === "orange",
        "!bg-gray-400! text-warning-content": label === "debug",
        "!bg-success !text-success-content": color === "green",
        "!bg-black": color === "black"
    };

    const additionalClasses = Object.entries(dynamicClass)
        .filter(([_, condition]) => condition)
        .map(([className]) => className)
        .join(" ");

    return `${baseClass} ${additionalClasses}`;
});

watch(collapseStore, (value) => {
    open.value = value.open;
});

const getLabel = computed(() => {
    if (Object.values(props.payload.with_label).length > 0 && props.payload.with_label.label !== "") {
        return props.payload.with_label.label;
    }

    return props.payload.type;
});

const block = () => {
    props.payload.queries?.sql && queriesBlockedStore.toggle(props.payload.queries?.sql);
};

const isDuplicated = (sql) => {
    return duplicatesStore.duplicatesInfo.some((info) => info.request_id === timeStore.selected && info.sql === sql && info.has_duplicated);
};

const decrementBadgeCount = () => {
    if (shouldDisplayBadge) {
        window.ipcRenderer.send("badge-icon.decrement");

        payloadStore.updatePayload(props.payload, "show_badge_count", () => false);
        return;
    }
};

const shouldDisplayBadge = computed(() => {
    return props.payload.show_badge_count && props.payload.to_screen.screen_name === "home" && settingsStore.settings.show_badge_count;
});

const hasContext = computed(() => {
    if (props.payload.context?.context) {
        return Object.keys(props.payload.context.context).length > 0;
    }

    if (props.payload.extra && props.payload.extra.context) {
        return Object.keys(props.payload.extra.context).length > 0;
    }

    return false;
});

const getContextPayload = computed(() => {
    if (props.payload.context?.context) {
        return props.payload.context.context;
    }

    if (props.payload.extra && props.payload.extra.context) {
        return props.payload.extra.context;
    }

    return {};
});
</script>
<template>
    <div v-if="(payload.queries && queriesChart.type === 'none') || payload.type !== 'queries'">
        <div
            @mouseenter="decrementBadgeCount"
            :class="{
                'collapse-open': open
            }"
            class="card card-border border-base-300 collapse bg-base-100 bg-laravel"
        >
            <div
                @click="open = !open"
                :class="{}"
                class="collapse-title items-center justify-between flex text-xs select-none"
            >
                <ul
                    class="flex items-center gap-5 whitespace-nowrap"
                    v-bind:style="payload.ide_handle.real_path ? 'list-style-type: disc;' : ''"
                >
                    <li class="list-none opacity-70">
                        {{ moment(payload.date_time).format("hh:mm:ss a") }}
                    </li>
                    <li class="select-none opacity-70">
                        <DumpLink :ide-handler="payload.ide_handle" />
                    </li>
                </ul>

                <div class="group flex justify-center items-center gap-2">
                    <div
                        v-show="open"
                        class="mr-1 flex justify-center items-center gap-3 opacity-0 transition-all ease-in duration-300 group-hover:opacity-100"
                    >
                        <div
                            v-if="payload.queries && open"
                            :data-tippy-content="$t('click_to_block')"
                            @click.stop="block"
                            class="opacity-0 transition-all group-hover:opacity-100"
                        >
                            <LockClosedIcon class="size-4 hover:opacity-75" />
                        </div>

                        <div
                            v-if="!['table'].includes(screenStore.screen)"
                            @click.stop="copyDump"
                            :data-tippy-content="$t('click_to_copy')"
                        >
                            <CopyToClick />
                        </div>
                    </div>

                    <div v-show="!open">
                        <div class="flex items-center opacity-80 justify-end gap-2">
                            <IconWarning
                                v-if="isDuplicated(payload.queries?.sql)"
                                class="text-warning w-4"
                            />

                            <span v-if="payload.queries && payload.queries.time"> {{ payload.queries.time }}<span class="font-semibold text-[10px]">ms</span> </span>
                        </div>
                    </div>

                    <div
                        v-show="open && shouldDisplayBadge"
                        class="relative items-center"
                    >
                        <div class="group:opacity-100 bg-warning w-2 h-2 rounded-full absolute"></div>
                        <div class="group:opacity-100 bg-warning w-2 h-2 animate-ping rounded-full"></div>
                    </div>

                    <!-- variable type -->
                    <div
                        v-show="settingsStore.settings.show_variable_type && payload.dump?.variable_type !== undefined"
                        class="text-[0.70rem] opacity-70"
                        v-text="`(${payload.dump?.variable_type})`"
                    ></div>

                    <div
                        class="-mr-1 !text-[0.68rem] p-2.5 !font-semibold"
                        v-if="payload.type !== `queries`"
                        :class="badgeClasses"
                    >
                        {{ getLabel }}
                    </div>
                </div>
            </div>
            <div
                class="collapse-content"
                v-on:click.right="openOptions = true"
                v-on:click="openOptions = false"
            >
                <div
                    class="relative"
                    :class="{ 'overflow-auto w-full': ['queries', 'table', 'table_v2'].includes(payload.type) }"
                >
                    <DumpDump
                        :id="`dump-content-${payload.sf_dump_id}`"
                        class="text-base-content break-all"
                        v-if="payload.type === `dump`"
                        :payload="payload"
                    />

                    <DumpModel
                        :id="`dump-content-${payload.sf_dump_id}`"
                        class="text-base-content break-all"
                        v-if="payload.type === `model`"
                        :payload="payload"
                    />

                    <DumpTimeTrack
                        :id="`dump-content-${payload.sf_dump_id}`"
                        v-if="payload.type === `time_track`"
                        :payload="payload"
                    />

                    <!-- dump mailable -->
                    <DumpMailable
                        :id="`dump-content-${payload.sf_dump_id}`"
                        v-if="payload.type === `mailable`"
                        :payload="payload"
                    />

                    <!-- dump html -->
                    <DumpHTML
                        :id="`dump-content-${payload.sf_dump_id}`"
                        v-if="payload.type === `html`"
                        :payload="payload"
                    />

                    <!-- dump table -->
                    <DumpTable
                        :id="`dump-content-${payload.sf_dump_id}`"
                        class="w-full"
                        v-if="payload.type === `table`"
                        :payload="payload"
                    />

                    <!-- dump table v2 -->
                    <DumpTableV2
                        :id="`dump-content-${payload.sf_dump_id}`"
                        class="w-full"
                        v-if="['table_v2', 'http_client'].includes(payload.type)"
                        :payload="payload"
                    />

                    <!-- dump model -->
                    <DumpJson
                        :id="`dump-content-${payload.sf_dump_id}`"
                        class="w-full"
                        v-if="payload.type === `json`"
                        :payload="payload"
                    />

                    <!-- dump queries -->
                    <DumpQueries
                        :id="`dump-content-${payload.sf_dump_id}`"
                        class="w-full"
                        v-if="payload.type === `queries`"
                        :payload="payload"
                    />

                    <!-- dump query -->
                    <DumpQuery
                        :id="`dump-content-${payload.sf_dump_id}`"
                        v-if="payload.type === `query`"
                        :query="payload.query"
                    />

                    <DumpContains
                        :id="`dump-content-${payload.sf_dump_id}`"
                        :payload="payload"
                    />

                    <DumpIsJson
                        :id="`dump-content-${payload.sf_dump_id}`"
                        :payload="payload"
                    />

                    <div
                        v-if="showContext && hasContext"
                        class="mt-3 flex justify-center flex-col !text-xs space-y-3 bg-base-200 p-4 rounded-md"
                    >
                        <div class="text-center uppercase opacity-80">Context</div>

                        <VueJsonPretty
                            :show-icon="false"
                            :show-length="true"
                            :show-line="false"
                            :data="getContextPayload"
                            :show-double-quotes="true"
                            class="!text-xm"
                            :deep="4"
                        />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
<style>
@reference "./../styles.css";

.card {
    display: grid !important;
}

.vjs-carets {
    @apply opacity-60 pr-1 top-2;
}

.vjs-tree-brackets {
    @apply !opacity-60;
}

.vjs-indent-unit {
    @apply !w-6;
}

.vjs-value-string {
    @apply !text-secondary;
}
</style>
