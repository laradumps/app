<script setup lang="ts">
import { computed, defineProps, nextTick, onMounted, ref } from "vue";
import moment from "moment";
import { EyeIcon, TrashIcon } from "@heroicons/vue/24/outline";
import { ExclamationCircleIcon, MagnifyingGlassIcon, ExclamationTriangleIcon, InformationCircleIcon } from "@heroicons/vue/24/outline";

import { IdeHandle } from "@/types/IdeHandle";
import { useCurrentProject } from "@/store/current-project";
import { Log, useLogStore } from "@/store/logs";
import CodeSnippet from "@/components/CodeSnippet.vue";
import HeaderColorsFilter from "@/components/HeaderColorsFilter.vue";
import { useColorStore } from "@/store/colors";
import { useSettingsStore } from "@/store/settings";
import SvgEmpty from "@/components/Svg/SvgEmpty.vue";

const logStore = useLogStore();
const currentProjectStore = useCurrentProject();
const colorStore = useColorStore();
const settingsStore = useSettingsStore();

const search = ref("");
const forceUpdate = ref(0);
const selectedLogDetail = ref();

const props = defineProps<{
    items: Record<string, Log>;
    inScreenWindow: boolean;
}>();

const generateLink = (ideHandler: IdeHandle) => {
    const ide_handler = settingsStore.settings.ide_handler ? settingsStore.settings.ide_handler : "phpstorm://open?file={filepath}&line={line}";

    const { project_path, real_path, workdir, wsl_config, base_path, line } = ideHandler;
    const relativePath = real_path?.replace(workdir, "").replace(project_path, "");
    let linkPath = project_path + relativePath;

    if (base_path) {
        linkPath = linkPath.replace(base_path, currentProjectStore.value);
    }

    if (real_path) {
        let link = ide_handler.replace("{filepath}", linkPath).replace("{line}", line);
        if (ide_handler.includes("wsl_config") && wsl_config) {
            link = link.replace("{wsl_config}", wsl_config);
        }
        return link;
    }
};

const logs = computed(() => {
    forceUpdate.value;

    const items = props.items ? props.items : logStore.logs;

    return Object.values(items)
        .filter((log: Log) => {
            if (colorStore.colors.length > 0) {
                return colorStore.colors.includes(log.color);
            }
            return true;
        })
        .filter((log: Log) => {
            const searchTerm = search.value.toLowerCase();
            return log.message.toLowerCase().includes(searchTerm) || log.level.includes(searchTerm) || log.context[0].includes(searchTerm);
        })
        .sort((a, b) => {
            const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
            return dateB - dateA;
        });
});

const clear = () => {
    logStore.clear();
};

const openModal = (id: string) => {
    const findLog: Log | undefined = logs.value.find((log: Log) => log.log_id === id);

    if (!findLog) {
        return;
    }

    selectedLogDetail.value = {
        id: findLog.log_id,
        code_snippet: findLog.code_snippet,
        message: findLog.message,
        context: findLog.context[0],
        level: findLog.level,
        ide_handle: findLog.ide_handle
    };

    const sfDumpId = findLog.context[1];

    nextTick(() => {
        const sfDump = document.getElementById(`sf-dump-${sfDumpId}`);

        if (sfDump && !sfDump.hasAttribute("has-dump-js")) {
            sfDump.setAttribute("has-dump-js", "true");
            window.Sfdump(`sf-dump-${sfDumpId}`);
        }

        modal.showModal();
    });
};

onMounted(() => {
    setInterval(() => {
        forceUpdate.value++;
    }, 60_000);
});

const closeModal = () => {
    selectedLogDetail.value = null;
};
</script>

<template>
    <div class="px-3">
        <dialog
            id="modal"
            class="modal"
            v-if="selectedLogDetail"
            @close="closeModal"
        >
            <div class="modal-box max-w-3xl max-h-[calc(100vh-74px)]">
                <div class="py-4 space-y-5">
                    <div>{{ selectedLogDetail.message }}</div>
                    <div>
                        <CodeSnippet
                            v-if="selectedLogDetail.code_snippet.length > 0"
                            :code_snippet="selectedLogDetail.code_snippet"
                            :ide_handle="selectedLogDetail.ide_handle"
                        />
                        <div v-else>
                            <div v-html="selectedLogDetail.context"></div>
                        </div>
                    </div>
                </div>
            </div>
            <form
                method="dialog"
                class="modal-backdrop"
            >
                <button>close</button>
            </form>
        </dialog>

        <div
            class="space-y-3"
            :class="{ 'h-[calc(100vh-100px)]': inScreenWindow, 'h-[calc(100vh-150px)]': !inScreenWindow }"
        >
            <div class="flex items-center gap-1 justify-between mt-1">
                <label class="input w-full input-sm">
                    <MagnifyingGlassIcon class="size-4" />
                    <input
                        v-model="search"
                        type="search"
                        class="grow"
                        :placeholder="$t('search')"
                    />
                </label>
                <button
                    @click="clear()"
                    class="btn btn-sm p-[0.5rem]"
                    data-tippy-content="Clear"
                >
                    <TrashIcon class="w-4" />
                </button>
            </div>

            <div
                v-if="logs.length > 0"
                class="overflow-auto"
                style="height: -webkit-fill-available"
            >
                <table class="table">
                    <thead>
                        <tr>
                            <th class="w-4">Level</th>
                            <th>Message</th>
                            <th class="w-6">Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for="(log, index) in logs"
                            :key="`log-${index}`"
                            class="hover:bg-base-100 cursor-pointer"
                            @click="openModal(log.log_id)"
                        >
                            <td>
                                <span
                                    class="badge text-xs !text-semibold badge-info p-1.5"
                                    v-if="log.level === 'info'"
                                    ><InformationCircleIcon class="w-5" /> Info</span
                                >
                                <span
                                    class="badge text-xs badge-success"
                                    v-else-if="log.level === 'notice'"
                                    ><InformationCircleIcon class="w-5" /> Notice</span
                                >

                                <span
                                    class="badge text-xs !text-semibold badge-warning p-1.5"
                                    v-else-if="log.level === 'warning'"
                                >
                                    <ExclamationTriangleIcon class="w-5" />
                                    Warning
                                </span>
                                <span
                                    class="badge text-xs !text-semibold badge-error p-1.5"
                                    v-else-if="log.level === 'error'"
                                >
                                    <ExclamationCircleIcon class="w-5" />Error</span
                                >
                                <span
                                    class="badge text-xs !text-semibold badge-error p-1.5"
                                    v-else-if="log.level === 'alert'"
                                >
                                    <ExclamationCircleIcon class="w-5" />Alert</span
                                >
                                <span
                                    class="badge text-xs !text-semibold badge-error p-1.5"
                                    v-else-if="log.level === 'critical'"
                                >
                                    <ExclamationTriangleIcon class="w-5" />Critical</span
                                >
                                <span
                                    class="badge text-xs !text-semibold badge-error p-1.5"
                                    v-else-if="log.level === 'emergency'"
                                    ><ExclamationCircleIcon class="w-5" />Emergency</span
                                >
                                <span
                                    class="badge text-xs !text-semibold bg-gray-500 text-primary-content p-1.5"
                                    v-else-if="log.level === 'debug'"
                                    ><InformationCircleIcon class="w-5" />Debug</span
                                >
                            </td>
                            <td class="break-words break-all">
                                <div class="line-clamp-2">{{ log.message }}</div>
                                <a
                                    v-if="log.ide_handle.class_name !== 'empty'"
                                    :href="generateLink(log.ide_handle)"
                                    v-text="`${log.ide_handle.class_name}:${log.ide_handle.line}`"
                                    class="link text-xs opacity-60"
                                >
                                </a>
                            </td>
                            <td class="whitespace-nowrap text-right">
                                <div class="flex flex-col">
                                    <span>{{ moment(log.created_at).fromNow() }}</span>
                                    <span class="opacity-65 text-xs">{{ moment(log.created_at).format("HH:mm:ss") }}</span>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div
                v-else
                class="-ml-8 -mt-14 absolute flex items-center justify-center w-full"
                style="height: -webkit-fill-available"
            >
                <SvgEmpty class="w-30 opacity-25" />
                <div class="text-base-content/70">
                    <h1 class="text-lg font-semibold mb-2">No Logs</h1>
                </div>
            </div>
        </div>
    </div>
</template>
<style scoped>
@reference "./../../styles.css";

::v-deep(.table) {
    :where(th, td) {
        @apply p-1.5;
    }
}
</style>
