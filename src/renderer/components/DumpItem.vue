<script setup lang="ts">
import { computed, defineProps, nextTick, onMounted, ref } from "vue";
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

const duplicatesStore = useQueryDuplicated();
const timeStore = useTimeStore();

const saveDump = () => window.ipcRenderer.send("main:save-dumps", JSON.stringify(props.payload));

const open = ref(true);
const openOptions = ref(false);

const removeSaveDump = () => {
    const payloadId = props.payload.id;
    window.ipcRenderer.send("saved-dumps:remove", payloadId);
    document.getElementById(payloadId).remove();
};

const props = defineProps<{
    payload: Payload;
    inSavedDumpsWindow?: boolean;
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
</script>
<template>
    <div class="group text-sm pt-2">
        <div class="px-3 w-full">
            <div
                :class="{
                    [`!border-l-4 ` + borderColor]: typeof borderColor !== 'undefined',
                    [bgColor]: typeof bgColor !== 'undefined',
                    'collapse-open': open,
                    'collapse-close': open
                }"
                class="collapse bg-base-200/70 bg-laravel border border-base-content/5"
            >
                <div
                    @dblclick="open = !open"
                    title="Double click to collapse"
                    class="select-none !cursor-default collapse-title gap-2 text-base-content justify-between items-center font-light flex text-[12px]"
                >
                    <ul
                        class="flex gap-6 whitespace-nowrap"
                        v-bind:style="props.payload.ide_handle.real_path ? 'list-style-type: disc;' : ''"
                    >
                        <li class="list-none">
                            {{ props.payload.date_time }}
                        </li>
                        <li>
                            <DumpLink :ide-handler="props.payload.ide_handle" />
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
                            <div
                                :title="$t('menu.saved_dumps')"
                                @click="saveDump"
                                v-if="!inSavedDumpsWindow"
                            >
                                <SaveDump />
                            </div>
                            <div
                                :title="$t('menu.remove')"
                                @click="removeSaveDump"
                                v-if="inSavedDumpsWindow"
                            >
                                <IconTrash class="cursor-pointer size-4" />
                            </div>
                        </div>

                        <!-- variable type -->
                        <div
                            v-show="props.payload.dump?.variable_type !== undefined"
                            class="text-[0.70rem]"
                            v-text="`(${props.payload.dump?.variable_type})`"
                        ></div>

                        <div
                            v-if="props.payload.type !== `queries`"
                            class="badge text-xs text-neutral-content bg-neutral border border-neutral-content/20 shadow-lg rounded-box w-auto"
                        >
                            {{ props.payload.label ?? props.payload.type }}
                        </div>

                        <div
                            v-if="isDuplicated(payload.queries?.sql)"
                            class="badge font-semibold badge-warning text-warning-content uppercase text-xs"
                        >
                            Duplicated
                        </div>

                        <div class="-mr-2 text-base-content/70 p-2">
                            <button
                                v-show="!open"
                                v-on:click="open = true"
                            >
                                <span>▶</span>
                            </button>
                            <button
                                v-show="open"
                                v-on:click="open = false"
                            >
                                <span>▼</span>
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
    </div>
</template>
