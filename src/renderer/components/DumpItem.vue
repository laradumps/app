<template>
    <div class="group text-sm flex transition-all !block">
        <div class="px-3 w-full">
            <div class="collapse collapse-plus border border-base-300 bg-base-200">
                <input
                    type="checkbox"
                    checked
                    class="peer"
                />
                <div class="collapse-title text-xl font-medium">
                    <div class="gap-2 text-base-content justify-between items-center font-light flex text-[11px]">
                        <ul class="flex gap-6 !list-disc">
                            <li class="list-none">
                                <div class="flex gap-1">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke-width="1.5"
                                        stroke="currentColor"
                                        class="w-3"
                                    >
                                        <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                                        />
                                    </svg>

                                    {{ props.payload.date_time }}
                                </div>
                            </li>
                            <li>
                                <DumpLink
                                    v-if="fullIdeHandle"
                                    :class="{ 'blur-sm': !privacy.isOpen }"
                                    :href="props.payload.ide_handle.handler"
                                    :title="`Open ` + fullIdeHandle"
                                    :value="fullIdeHandle"
                                />
                            </li>
                        </ul>

                        <div class="flex gap-2 items-center">
                            <div
                                v-if="props.payload.dump?.variable_type !== undefined"
                                class="text-[0.70rem] text-primary-100 select-none"
                                v-text="`(${props.payload.dump.variable_type})`"
                            ></div>
                            <div class="badge badge-primary text-[11px]">{{ props.payload.label ?? props.payload.type }}</div>
                        </div>
                    </div>
                </div>
                <div class="collapse-content">
                    <div>
                        <div
                            v-if="props.payload.type === 'dump'"
                            v-show="props.payload.dump?.dump !== ''"
                            class="mt-2 text-base-content"
                            v-html="props.payload.dump?.dump === null ? 'null' : props.payload.dump.dump"
                        ></div>

                        <DumpModel
                            class="mt-2 text-base-content"
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
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, defineProps, onMounted, ref, watch } from "vue";
import { TrashIcon } from "@heroicons/vue/20/solid";
import IconChevronRight from "@/components/Icons/IconChevronRight.vue";
import IconChevronDown from "@/components/Icons/IconChevronDown.vue";
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

const fullIdeHandle = computed(() => {
    if (props.payload.ide_handle.line.toString() !== "") {
        return props.payload.ide_handle.class_name + ":" + props.payload.ide_handle.line;
    }

    if (props.payload.ide_handle.class_name === "Tinker") {
        return "Tinker";
    }

    return null;
});

const color = computed(() => {
    let border;
    let color;

    if (typeof props.payload.color !== "undefined") {
        color = props.payload.color;
    }

    switch (color) {
        case "red":
            border = "border-red-500";
            break;
        case "warning":
        case "orange":
            border = "border-orange-500";
            break;
        case "green":
            border = "border-green-500";
            break;
        case "blue":
            border = "border-blue-500";
            break;
        case "gray":
            border = "border-gray-500";
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
