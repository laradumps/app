<script setup lang="ts">
import { computed, defineProps, nextTick, onMounted, ref } from "vue";
import { useTimeStore } from "@/store/time";
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

const borderColor = computed(() => {
    let border;
    let color;

    if (typeof props.payload.color !== "undefined") {
        color = props.payload.color;
    }

    switch (color) {
        case "red":
            border = "!border-l-error";
            break;
        case "warning":
        case "orange":
            border = "!border-l-warning";
            break;
        case "green":
            border = "!border-l-success";
            break;
        case "blue":
            border = "!border-l-info";
            break;
        case "gray":
            border = "!border-l-neutral";
            break;
        case "black":
            border = "!border-black";
            break;
        default:
            props.payload.color;
    }

    return border;
});

const bgColor = computed(() => {
    let bg;
    let color;

    if (typeof props.payload.color !== "undefined") {
        color = props.payload.color;
    }

    switch (color) {
        case "red":
            bg = "!bg-error/10";
            break;
        case "warning":
        case "orange":
            bg = "!bg-warning/10";
            break;
        case "green":
            bg = "!bg-success/10";
            break;
        case "blue":
            bg = "!bg-info/10";
            break;
        case "gray":
            bg = "!bg-neutral/10";
            break;
        case "black":
            bg = "!bg-black/10";
            break;
        default:
            props.payload.color;
    }

    return bg;
});
</script>
<template>
    <div class="group text-sm pt-2">
        <div class="px-3 w-full">
            <div
                :class="{
                    [`!border-l-4 ` + borderColor]: typeof borderColor !== 'undefined',
                    [bgColor]: typeof bgColor !== 'undefined',
                    'collapse-open': open,
                    'collapse-close': open,
                    'bg-warning/10' : payload?.queries?.duplicated ?? false
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
                        v-bind:style="props.payload.ide_handle ? 'list-style-type: disc;' : ''"
                    >
                        <li class="list-none">
                            {{ props.payload.date_time }}
                        </li>
                        <li>
                            <DumpLink :ide-handler="props.payload.ide_handle" />
                        </li>
                    </ul>
                    <div class="group flex justify-center items-center gap-2">
                        <!-- variable type -->
                        <div
                            v-if="props.payload.dump?.variable_type !== undefined"
                            class="text-[0.70rem]"
                            v-text="`(${props.payload.dump.variable_type})`"
                        ></div>

                        <div
                            :title="$t('click_to_copy')"
                            class="hidden group-hover:block p-1"
                            @click="copyDump"
                        >
                            <CopyToClick />
                        </div>
                        <div
                            :title="$t('menu.saved_dumps')"
                            class="hidden group-hover:block p-1"
                            @click="saveDump"
                            v-if="!inSavedDumpsWindow"
                        >
                            <SaveDump />
                        </div>
                        <div
                            :title="$t('menu.remove')"
                            class="hidden group-hover:block p-1"
                            @click="removeSaveDump"
                            v-if="inSavedDumpsWindow"
                        >
                            <IconTrash class="cursor-pointer size-4 hover:opacity-75" />
                        </div>
                        <div
                            v-if="props.payload.type !== `queries`"
                            class="badge text-xs text-neutral-content bg-neutral border border-neutral-content/20 shadow-lg rounded-box w-auto"
                        >
                            {{ props.payload.label ?? props.payload.type }}
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
