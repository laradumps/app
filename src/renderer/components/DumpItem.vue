<template>
    <div class="group text-sm pt-2">
        <div class="px-3 w-full">
            <details
                :class="{
                    [`!border-l-4 ` + color]: typeof color !== 'undefined'
                }"
                class="collapsable collapse border border-base-200 bg-base-200"
                open
            >
                <summary class="collapse-title text-xl font-medium">
                    <div class="gap-2 text-base-content opacity-70 justify-between items-center font-light flex text-[11px]">
                        <ul
                            class="flex gap-6"
                            v-bind:style="props.payload.ide_handle ? 'list-style-type: disc;' : ''"
                        >
                            <li class="list-none">
                                {{ props.payload.date_time }}
                            </li>
                            <li style="margin-left: -5px">
                                <DumpLink :ide-handler="props.payload.ide_handle" />
                            </li>
                        </ul>

                        <div
                            v-if="props.payload.type !== `queries`"
                            class="text-primary uppercase text-[10px] font-semibold tracking-wider"
                        >
                            {{ props.payload.label ?? props.payload.type }}
                        </div>
                    </div>
                </summary>
                <div class="collapse-content">
                    <div>
                        <div
                            v-if="props.payload.type !== `queries`"
                            class="flex opacity-0 group-hover:opacity-100 transition-all absolute right-4 z-300 gap-4 items-center text-base-content"
                        >
                            <!-- variable type -->
                            <div
                                v-if="props.payload.dump?.variable_type !== undefined"
                                class="text-[0.70rem]"
                                v-text="`(${props.payload.dump.variable_type})`"
                            ></div>

                            <!-- click to copy -->
                            <CopyToClick
                                @click="copyDump"
                                class="opacity-60 hover:opacity-100"
                            />

                            <!-- save dumps -->
                            <div
                                @click="saveDump"
                                class="cursor-pointer opacity-60 hover:opacity-100"
                                v-if="!inSavedDumpsWindow"
                            >
                                <IconSave
                                    class="w-3 h-3 opacity-70"
                                    id="saveIcon"
                                />
                            </div>
                        </div>

                        <div
                            v-if="props.payload.type === 'dump'"
                            v-show="props.payload.dump?.dump !== ''"
                            class="text-base-content"
                            v-html="props.payload.dump?.dump === null ? 'null' : props.payload.dump.dump"
                        ></div>

                        <DumpModel
                            class="text-base-content"
                            v-if="props.payload.type === `model`"
                            :payload="payload"
                        />

                        <DumpTimeTrack
                            v-if="props.payload.type === `time_track`"
                            :payload="payload"
                        />

                        <!-- dump mailable -->
                        <DumpMailable
                            v-if="props.payload.type === `mailable`"
                            :payload="payload"
                        />

                        <!-- dump html -->
                        <DumpHTML
                            v-if="props.payload.type === `html`"
                            :payload="payload"
                        />

                        <!-- dump notification -->
                        <DumpMail
                            v-if="props.payload.type === `mail`"
                            :payload="payload"
                        />

                        <!-- dump table -->
                        <DumpTable
                            class="w-full"
                            v-if="props.payload.type === `table`"
                            :payload="payload"
                        />

                        <!-- dump table v2 -->
                        <DumpTableV2
                            class="w-full"
                            v-if="['table_v2', 'http_client'].includes(props.payload.type)"
                            :payload="payload"
                        />

                        <!-- dump model -->
                        <DumpJson
                            class="w-full"
                            v-if="props.payload.type === `json`"
                            :payload="payload"
                        />

                        <!-- dump log -->
                        <DumpLog
                            class="w-full"
                            v-if="props.payload.type === `log_application`"
                            :payload="payload"
                        />

                        <!-- dump queries -->
                        <DumpQueries
                            class="w-full"
                            v-if="props.payload.type === `queries`"
                            :payload="payload"
                        />

                        <!-- dump query -->
                        <DumpQuery
                            class="w-full"
                            v-if="props.payload.type === `query`"
                            :payload="payload"
                        />

                        <DumpContains :payload="payload" />

                        <DumpIsJson :payload="payload" />
                    </div>
                </div>
            </details>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, defineProps, nextTick, onMounted, ref, watch } from "vue";
import { CheckIcon } from "@heroicons/vue/20/solid";
import { useCollapse } from "@/store/collapse";
import { usePrivacy } from "@/store/privacy";
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

const timeStore = useTimeStore();
const collapseStore = useCollapse();
const privacy = usePrivacy();

const viewed = ref(false);

const saveDump = () => window.ipcRenderer.send("main:save-dumps", JSON.stringify(props.payload));

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
    const value = document.getElementById(`sf-dump-${props.payload.sf_dump_id}`)?.innerText;

    navigator.clipboard.writeText(value).then(() => {});
    changeIcon();
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

const changeIcon = () => {
    document.getElementById("saveIcon").innerHTML = "√";
    setTimeout(function () {
        document.getElementById("saveIcon").innerHTML = "";
    }, 2000);
};

const expandAll = () => {
    setTimeout(() => {
        const elements = document.querySelectorAll(`#sf-dump-${props.payload.sf_dump_id} .sf-dump-toggle`);
        elements.forEach((element, index) => {
            if (index !== 0) {
                element.click();
            }
        });
    }, 1);
};

const color = computed(() => {
    let border;
    let color;

    if (typeof props.payload.color !== "undefined") {
        color = props.payload.color;
    }

    switch (color) {
        case "red":
            border = "border-l-error";
            break;
        case "warning":
        case "orange":
            border = "border-l-warning";
            break;
        case "green":
            border = "border-l-success";
            break;
        case "blue":
            border = "border-l-info";
            break;
        case "gray":
            border = "border-l-neutral";
            break;
        case "black":
            border = "border-black";
            break;
        default:
            props.payload.color;
    }

    return border;
});
</script>
