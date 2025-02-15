<script setup lang="ts">
import { computed, defineProps, nextTick, onMounted, ref, watch } from "vue";
import DumpLink from "@/components/DumpLink.vue";
import DumpQueries from "@/components/DumpQueries.vue";
import DumpJson from "@/components/DumpJson.vue";
import DumpLog from "@/components/DumpLog.vue";
import DumpModel from "@/components/DumpModel.vue";
import DumpTable from "@/components/DumpTable.vue";
import DumpHTML from "@/components/DumpHTML.vue";
import SaveDump from "@/components/SaveDump.vue";
import DumpTimeTrack from "@/components/DumpTimeTrack.vue";
import DumpContains from "@/components/DumpContains.vue";
import DumpMailable from "@/components/DumpMailable.vue";
import DumpIsJson from "@/components/DumpIsJson.vue";
import DumpTableV2 from "@/components/DumpTableV2.vue";
import DumpQuery from "@/components/DumpQuery.vue";
import { Payload } from "@/types/Payload";
import DumpMail from "@/components/DumpMail.vue";
import CopyToClick from "@/components/CopyToClick.vue";
import DumpDump from "@/components/DumpDump.vue";
import IconTrash from "@/components/Icons/IconTrash.vue";
import { useQueryDuplicated } from "@/store/query-duplicated";
import { useTimeStore } from "@/store/time";
import { useCollapse } from "@/store/collapse";
import { useSettingsStore } from "@/store/settings";

const duplicatesStore = useQueryDuplicated();
const timeStore = useTimeStore();
const collapseStore = useCollapse();
const settingsStore = useSettingsStore();

const open = ref(true);
const openOptions = ref(false);

const props = defineProps<{
    payload: Payload;
}>();

const copyDump = () => {
    nextTick(() => {
        const value = document.getElementById(`dump-content-${props.payload.sf_dump_id}`)?.innerText;

        navigator.clipboard.writeText(value).then(() => {});
    });
};

onMounted(() => {
    if (props.payload.dump?.dump) {
        const { dump } = props.payload.dump;

        if (typeof dump === "string" && props.payload.sf_dump_id) {
            if (dump.includes(`sf-dump-${props.payload.sf_dump_id}`)) {
                window.Sfdump(`sf-dump-${props.payload.sf_dump_id}`);
            }
        }
    }
});

const getColorClass = (colorType: string) => {
    let borderClass = "";
    let bgClass = "";

    if (typeof props.payload.color !== "undefined") {
        switch (props.payload.color) {
            case "red":
                borderClass = "!border-l-error";
                bgClass = "!bg-error/10";
                break;
            case "orange":
            case "warning":
                borderClass = "!border-l-warning";
                bgClass = "!bg-warning/10";
                break;
            case "green":
                borderClass = "!border-l-success";
                bgClass = "!bg-success/10";
                break;
            case "blue":
                borderClass = "!border-l-info";
                bgClass = "!bg-info/10";
                break;
            case "gray":
                borderClass = "!border-l-neutral";
                bgClass = "!bg-neutral/10";
                break;
            case "black":
                borderClass = "!border-black";
                bgClass = "!bg-black/10";
                break;
            default:
                borderClass = props.payload.color;
                bgClass = props.payload.color;
                break;
        }

        return colorType === "border" ? borderClass : bgClass;
    }

    return props.payload.color;
};

const borderColor = computed(() => getColorClass("border"));
const bgColor = computed(() => getColorClass("bg"));

const isDuplicated = (sql) => {
    return duplicatesStore.duplicatesInfo.some((info) => info.request_id === timeStore.selected && info.sql === sql && info.has_duplicated);
};

const badgeClasses = computed(() => {
    const { color } = props.payload;
    const { label } = props.payload.with_label;

    const baseClass = "badge uppercase font-semibold text-xs text-base-content bg-base-100 border border-neutral-content/20 shadow-sm rounded-box w-auto";

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
</script>
<template>
    <div class="px-2 w-full">
        <div
            :class="{
                [`!border-l-2 ` + borderColor]: typeof borderColor !== 'undefined',
                [bgColor]: typeof bgColor !== 'undefined',
                'collapse-open': open
            }"
            id=""
            class="collapse bg-base-300/70 bg-laravel border border-base-content/5"
        >
            <div
                @dblclick="open = !open"
                title="Double click to collapse"
                class="select-none !cursor-default collapse-title text-base-content justify-between items-center font-light flex text-xs"
            >
                <ul
                    class="flex items-center gap-6 whitespace-nowrap"
                    v-bind:style="props.payload.ide_handle.real_path ? 'list-style-type: disc;' : ''"
                >
                    <li class="list-none">
                        {{ payload.date_time }}
                    </li>
                    <li>
                        <DumpLink :ide-handler="payload.ide_handle" />
                    </li>
                </ul>
                <div class="group flex justify-center items-center gap-2">
                    <div
                        v-show="open"
                        class="mr-1 group flex justify-center items-center gap-3 opacity-0 transition-all ease-in duration-300 group-hover:opacity-100"
                    >
                        <div
                            :title="$t('click_to_copy')"
                            @click="copyDump"
                        >
                            <CopyToClick />
                        </div>
                        <!--                            <div-->
                        <!--                                :title="$t('menu.saved_dumps')"-->
                        <!--                                @click="saveDump"-->
                        <!--                                v-if="!inSavedDumpsWindow"-->
                        <!--                            >-->
                        <!--                                <SaveDump />-->
                        <!--                            </div>-->
                        <!--                            <div-->
                        <!--                                :title="$t('menu.remove')"-->
                        <!--                                @click="removeSaveDump"-->
                        <!--                                v-if="inSavedDumpsWindow"-->
                        <!--                            >-->
                        <!--                                <IconTrash class="cursor-pointer size-4" />-->
                        <!--                            </div>-->
                    </div>

                    <!-- variable type -->
                    <div
                        v-show="settingsStore.settings.show_variable_type && payload.dump?.variable_type !== undefined"
                        class="text-[0.70rem] opacity-70"
                        v-text="`(${payload.dump?.variable_type})`"
                    ></div>

                    <div
                        class="-mr-1 !text-[0.7rem] !font-normal"
                        v-if="payload.type !== `queries`"
                        :class="badgeClasses"
                    >
                        {{ getLabel }}
                    </div>

                    <div
                        v-if="isDuplicated(payload.queries?.sql)"
                        class="badge font-semibold badge-warning text-warning-content uppercase text-xs"
                    >
                        Duplicated
                    </div>

                    <div class="flex items-center -mr-2 text-base-content/70 p-2">
                        <button
                            v-show="!open"
                            v-on:click="open = true"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke-width="1.5"
                                stroke="currentColor"
                                class="size-4"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    d="m8.25 4.5 7.5 7.5-7.5 7.5"
                                />
                            </svg>
                        </button>
                        <button
                            v-show="open"
                            v-on:click="open = false"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke-width="1.5"
                                stroke="currentColor"
                                class="size-4"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    d="m19.5 8.25-7.5 7.5-7.5-7.5"
                                />
                            </svg>
                        </button>
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
                    :class="{ 'overflow-auto w-[calc(100vw-70px)]': ['queries', 'table', 'table_v2'].includes(props.payload.type) }"
                >
                    <DumpDump
                        :id="`dump-content-${props.payload.sf_dump_id}`"
                        class="text-base-content break-all"
                        v-if="props.payload.type === `dump`"
                        :payload="payload"
                    />

                    <DumpModel
                        :id="`dump-content-${props.payload.sf_dump_id}`"
                        class="text-base-content break-all"
                        v-if="props.payload.type === `model`"
                        :payload="payload"
                    />

                    <DumpTimeTrack
                        :id="`dump-content-${props.payload.sf_dump_id}`"
                        v-if="props.payload.type === `time_track`"
                        :payload="payload"
                    />

                    <!-- dump mailable -->
                    <DumpMailable
                        :id="`dump-content-${props.payload.sf_dump_id}`"
                        v-if="props.payload.type === `mailable`"
                        :payload="payload"
                    />

                    <!-- dump html -->
                    <DumpHTML
                        :id="`dump-content-${props.payload.sf_dump_id}`"
                        v-if="props.payload.type === `html`"
                        :payload="payload"
                    />

                    <!-- dump notification -->
                    <DumpMail
                        :id="`dump-content-${props.payload.sf_dump_id}`"
                        v-if="props.payload.type === `mail`"
                        :payload="payload"
                    />

                    <!-- dump table -->
                    <DumpTable
                        :id="`dump-content-${props.payload.sf_dump_id}`"
                        class="w-full"
                        v-if="props.payload.type === `table`"
                        :payload="payload"
                    />

                    <!-- dump table v2 -->
                    <DumpTableV2
                        :id="`dump-content-${props.payload.sf_dump_id}`"
                        class="w-full"
                        v-if="['table_v2', 'http_client'].includes(props.payload.type)"
                        :payload="payload"
                    />

                    <!-- dump model -->
                    <DumpJson
                        :id="`dump-content-${props.payload.sf_dump_id}`"
                        class="w-full"
                        v-if="props.payload.type === `json`"
                        :payload="payload"
                    />

                    <!-- dump log -->
                    <DumpLog
                        :id="`dump-content-${props.payload.sf_dump_id}`"
                        class="w-full"
                        v-if="props.payload.type === `log_application`"
                        :payload="payload"
                    />

                    <!-- dump queries -->
                    <DumpQueries
                        :id="`dump-content-${props.payload.sf_dump_id}`"
                        class="w-full"
                        v-if="props.payload.type === `queries`"
                        :payload="payload"
                    />

                    <!-- dump query -->
                    <DumpQuery
                        :id="`dump-content-${props.payload.sf_dump_id}`"
                        v-if="props.payload.type === `query`"
                        :query="payload.query"
                    />

                    <DumpContains
                        :id="`dump-content-${props.payload.sf_dump_id}`"
                        :payload="payload"
                    />

                    <DumpIsJson
                        :id="`dump-content-${props.payload.sf_dump_id}`"
                        :payload="payload"
                    />
                </div>
            </div>
        </div>
    </div>
</template>
