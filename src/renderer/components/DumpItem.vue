<template>
    <div
        :class="{ 'items-center hover:bg-gradient-to-t from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900': !isOpen }"
        @mouseenter="markDumpItemViewed"
        class="group bg-white dark:bg-slate-900 text-sm flex transition-all border-t border-neutral-100 dark:border-slate-800"
    >
        <Transition
            enter-active-class="transition ease-out duration-300"
            enter-class="transform opacity-0 scale-95"
            enter-to-class="transform opacity-100 scale-100"
            leave-active-class="transition ease-in duration-300"
            leave-class="transform opacity-100 scale-100"
            leave-to-class="transform opacity-0 scale-95"
        >
            <div
                class="py-1 px-4 w-full"
                :class="{
                    [`!border-l-4 ` + color]: typeof color !== 'undefined',
                    'mb-3': isOpen,
                    'cursor-pointer !bg-transparent': !isOpen
                }"
            >
                <div class="items-center text-xs flex justify-between dark:text-slate-400">
                    <!-- label -->
                    <div
                        v-if="isOpen && (props.payload.label || props.payload.type)"
                        @click="isOpen = false"
                        class="dark:text-slate-400 cursor-pointer py-2 items-center uppercase text-[11px] select-none flex gap-3 w-full mr-3"
                    >
                        <div class="cursor-pointer items-center flex justify-between gap-2 hover:text-slate-800">
                            <IconChevronDown class="!w-4 !h-4 group-hover:text-blue-500" />

                            <!-- dateTime -->
                            <span
                                :class="{
                                    'font-normal text-slate-800 dark:text-slate-400': isOpen,
                                    'dark:text-slate-400': !isOpen
                                }"
                                class="line-clamp-2 !hidden select-none max-w-[100px] text-xs italic"
                            >
                                <span>{{ props.payload.date_time }}</span>
                            </span>
                        </div>

                        <div class="font-normal cursor-pointer">{{ props.payload.label ?? props.payload.type }}</div>
                    </div>

                    <div
                        v-show="isOpen"
                        class="text-xs flex items-center gap-3 italic font-normal"
                    >
                        <div class="group-hover:block hidden cursor-pointer">
                            <div
                                @click="saveDump"
                                v-if="isOpen && !inSavedDumpsWindow"
                            >
                                <IconSave class="w-3 h-3 text-slate-500 dark:text-slate-400 hover:text-slate-600" />
                            </div>
                            <div
                                @click="removeSaveDump"
                                v-if="isOpen && inSavedDumpsWindow"
                            >
                                <TrashIcon class="w-4 h-4 text-red-500 hover:text-slate-600" />
                            </div>
                        </div>

                        <div
                            v-show="!viewed"
                            class="rounded-full w-[10px] h-[010px] animate-pulse bg-orange-400"
                        ></div>

                        <span>{{ props.payload.date_time }}</span>
                    </div>
                </div>

                <!-- default -->
                <!-- border-gray-200 shadow-sm shadow-slate-300 dark:shadow-slate-600 dark:text-slate-200 -->
                <div
                    v-show="isOpen"
                    class="mt-1"
                >
                    <div
                        class="w-full p-3 bg-slate-100 dark:bg-slate-800 dark:text-slate-300"
                        v-if="props.payload.type === 'dump'"
                        v-show="props.payload.dump?.dump !== ''"
                    >
                        <div class="">
                            <div
                                class="text-[0.80rem] text-orange-500 select-none"
                                v-text="`(${props.payload.dump.type})`"
                            ></div>
                            <div v-html="props.payload.dump?.dump === null ? 'null' : props.payload.dump.dump"></div>
                        </div>
                    </div>

                    <!-- dump time-track -->
                    <DumpTimeTrack
                        v-if="isOpen && props.payload.type === `time_track`"
                        :payload="payload"
                    />

                    <!-- dump mailable -->
                    <DumpMailable
                        v-if="isOpen && props.payload.type === `mailable`"
                        :payload="payload"
                    />

                    <!-- dump html -->
                    <DumpHTML
                        v-if="isOpen && props.payload.type === `html`"
                        :payload="payload"
                    />

                    <!-- dump notification -->
                    <DumpMail
                        v-if="isOpen && props.payload.type === `mail`"
                        :payload="payload"
                    />

                    <!-- dump table -->
                    <DumpTable
                        class="w-full"
                        v-if="isOpen && props.payload.type === `table`"
                        :payload="payload"
                    />

                    <!-- dump table v2 -->
                    <DumpTableV2
                        class="w-full"
                        v-if="isOpen && ['table_v2', 'http_client'].includes(props.payload.type)"
                        :payload="payload"
                    />

                    <!-- dump model -->
                    <DumpJson
                        class="w-full"
                        v-if="isOpen && props.payload.type === `json`"
                        :payload="payload"
                    />

                    <!-- dump model -->
                    <DumpModel
                        class="w-full p-4 shadow bg-slate-100 dark:bg-slate-800"
                        v-if="isOpen && props.payload.type === `model`"
                        :payload="payload"
                    />

                    <!-- dump log -->
                    <DumpLog
                        class="w-full p-4 shadow-md dark:shadow-slate-800 bg-slate-50 dark:bg-slate-800"
                        v-if="isOpen && props.payload.type === `log_application`"
                        :payload="payload"
                    />

                    <!-- dump queries -->
                    <DumpQueries
                        class="w-full p-4 bg-slate-50 dark:bg-slate-800"
                        v-if="isOpen && props.payload.type === `queries`"
                        :payload="payload"
                    />

                    <!-- dump query -->
                    <DumpQuery
                        class="w-full p-4 bg-slate-50 dark:bg-slate-700"
                        v-if="isOpen && props.payload.type === `query`"
                        :payload="payload"
                    />
                </div>

                <DumpContains
                    v-show="isOpen"
                    :payload="payload"
                />

                <DumpIsJson
                    v-show="isOpen"
                    :payload="payload"
                />

                <!-- handle link open -->
                <div
                    v-show="isOpen"
                    :class="{ 'mt-3': isOpen }"
                    class="text-[0.85rem] hover:text-slate-800 min-h-[16px]"
                >
                    <DumpLink
                        v-if="fullIdeHandle"
                        :class="{ 'blur-sm': !privacy.isOpen }"
                        :href="props.payload.ide_handle.handler"
                        :title="`Open ` + fullIdeHandle"
                        :value="fullIdeHandle"
                    />
                </div>

                <!-- handle link close -->
                <div
                    v-show="!isOpen"
                    @click="isOpen = true"
                    :class="{ 'mt-3': isOpen }"
                    class="py-2 items-center text-xs flex justify-between dark:text-slate-400"
                >
                    <div class="dark:text-slate-400 uppercase text-[11px] cursor-pointer select-none flex gap-3">
                        <IconChevronRight class="!w-4 !h-4 dark:text-slate-600 group-hover:text-blue-500" />

                        <div class="font-normal">{{ props.payload.label ?? props.payload.type }}</div>
                    </div>

                    <div
                        :class="{ 'blur-sm': !privacy.isOpen }"
                        class="dark:text-slate-500 cursor-pointer font-light line-clamp-2 select-none text-xs italic"
                    >
                        <div class="gap-2 flex items-center">
                            <div
                                v-show="!viewed"
                                class="rounded-full w-[10px] h-[010px] animate-pulse bg-orange-400"
                            ></div>

                            <span>{{ fullIdeHandle }} | {{ props.payload.date_time }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </Transition>
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

const isOpen = ref(true);
const viewed = ref(false);

const markDumpItemViewed = () => {
    if (isOpen.value) {
        viewed.value = true;
    }
};
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

watch(collapseStore, (value) => (isOpen.value = value.isOpen));

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
