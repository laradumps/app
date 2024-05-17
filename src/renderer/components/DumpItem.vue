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
import IconSave from "@/components/Icons/IconSave.vue";
import DumpTimeTrack from "@/components/DumpTimeTrack.vue";
import DumpContains from "@/components/DumpContains.vue";
import DumpMailable from "@/components/DumpMailable.vue";
import DumpIsJson from "@/components/DumpIsJson.vue";
import DumpTableV2 from "@/components/DumpTableV2.vue";
import DumpQuery from "@/components/DumpQuery.vue";
import { Payload } from "@/types/Payload";
import DumpMail from "@/components/DumpMail.vue";
import CopyToClick from "@/components/CopyToClick.vue";
import { MinusIcon, PlusIcon } from "@heroicons/vue/16/solid";
import DumpDump from "@/components/DumpDump.vue";
import DumpLivewire from "@/components/DumpLivewire.vue";

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

    if (props.payload.type === "queries") {
        const { time } = props.payload.queries;
        timeStore.increment(props.payload.request_id, props.payload.id, time);
    }
});

const color = computed(() => {
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
</script>
<template>
    <div class="group text-sm pt-2">
        <div class="px-3 w-full">
            <div
                :class="{
                    [`!border-l-4 ` + color]: typeof color !== 'undefined',
                    'collapse-open': open,
                    'collapse-close': open
                }"
                class="collapse bg-base-200/70 bg-laravel"
            >
                <div
                    @dblclick="open = !open"
                    title="Double click to collapse"
                    class="select-none hover:opacity-75 !cursor-default collapse-title gap-2 text-base-content opacity-70 justify-between items-center font-light flex text-[11px]"
                >
                    <ul
                        class="flex gap-6"
                        v-bind:style="props.payload.ide_handle ? 'list-style-type: disc;' : ''"
                    >
                        <li class="list-none">
                            {{ props.payload.date_time }}
                        </li>
                        <li>
                            <DumpLink :ide-handler="props.payload.ide_handle" />
                        </li>
                    </ul>
                    <div class="flex justify-center items-center">
                        <div
                            v-if="props.payload.type !== `queries`"
                            class="text-primary uppercase text-[10px] font-semibold tracking-wider mr-3"
                        >
                            {{ props.payload.label ?? props.payload.type }}
                        </div>
                        <button
                            class="py-2"
                            v-show="!open"
                            v-on:click="open = true"
                        >
                            <PlusIcon class="w-4" />
                        </button>
                        <button
                            class="py-2"
                            v-show="open"
                            v-on:click="open = false"
                        >
                            <MinusIcon class="w-4" />
                        </button>
                    </div>
                </div>
                <div
                    class="collapse-content"
                    v-on:click.right="openOptions = true"
                    v-on:click="openOptions = false"
                >
                    <div class="relative w-[calc(100vw-70px)] overflow-auto">
                        <!-- variable type -->
                        <div
                            v-if="props.payload.dump?.variable_type !== undefined"
                            class="text-[0.70rem] opacity-70"
                            v-text="`(${props.payload.dump.variable_type})`"
                        ></div>
                        <div class="gap-4 flex absolute right-0 z-100">
                            <div
                                v-if="!['queries', 'table_v2'].includes(props.payload.type)"
                                class="transition-all -mt-2 items-center text-base-content"
                            >
                                <div
                                    class="right-0 absolute top-0"
                                    v-bind:class="{
                                        'opacity-100': openOptions,
                                        'opacity-0': !['query'].includes(props.payload.type)
                                    }"
                                >
                                    <ul class="flex items-center p-2 gap-3 shadow bg-base-100 rounded-box w-auto">
                                        <li
                                            :title="$t('click_to_copy')"
                                            class="p-1"
                                            @click="copyDump"
                                        >
                                            <a>
                                                <CopyToClick />
                                            </a>
                                        </li>
                                        <li
                                            :title="$t('menu.saved_dumps')"
                                            class="p-1"
                                            @click="saveDump"
                                            v-if="!inSavedDumpsWindow"
                                        >
                                            <a><IconSave class="cursor-pointer w-3 h-3 hover:opacity-75" /> </a>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>

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
