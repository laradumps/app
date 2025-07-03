<script setup lang="ts">
import { computed, defineProps, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import moment from "moment";
import { FunnelIcon, PlayIcon, TrashIcon } from "@heroicons/vue/24/outline";
import { ExclamationCircleIcon, ExclamationTriangleIcon, InformationCircleIcon } from "@heroicons/vue/24/outline";

import { IdeHandle } from "@/types/IdeHandle";
import { useCurrentProject } from "@/store/current-project";
import { Log, useLogStore } from "@/store/logs";
import CodeSnippet from "@/components/CodeSnippet.vue";
import { useColorStore } from "@/store/colors";
import { useSettingsStore } from "@/store/settings";
import SvgEmpty from "@/components/svg/SvgEmpty.vue";
import Divider from "@/components/common/Divider.vue";
import { useGlobalSearchStore } from "@/store/global-search";
import IconPause from "@/components/Icons/IconPause.vue";
import { usePauseLogsStore } from "@/store/pause-logs";

const logStore = useLogStore();
const currentProjectStore = useCurrentProject();
const colorStore = useColorStore();
const settingsStore = useSettingsStore();
const globalSearchStore = useGlobalSearchStore();
const pauseLogsStore = usePauseLogsStore();

const forceUpdate = ref(0);
const selected = ref();
const collapsedLogGroups = ref<Record<string, boolean>>({});

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
                return colorStore.colors.includes(colorStore.match(log.color));
            }
            return true;
        })
        .filter((log: Log) => {
            const searchTerm = globalSearchStore.search.toLowerCase();
            return log.message.toLowerCase().includes(searchTerm) || log.level.includes(searchTerm) || log.context[0].includes(searchTerm);
        })
        .sort((a, b) => {
            const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
            return dateB - dateA;
        });
});

const groupedLogsByRelativeTime = computed(() => {
    const groups: Record<string, Log[]> = {};
    for (const log of logs.value) {
        const timeKey = moment(log.created_at).fromNow();
        if (!groups[timeKey]) {
            groups[timeKey] = [];
        }
        groups[timeKey].push(log);
    }
    return groups;
});

const toggleLogGroup = (timeKey: string) => {
    collapsedLogGroups.value[timeKey] = !collapsedLogGroups.value[timeKey];
};

const clear = () => {
    logStore.clear();
};

const openModal = (id: string) => {
    const findLog: Log | undefined = logs.value.find((log: Log) => log.log_id === id);

    if (!findLog) {
        return;
    }

    selected.value = {
        id: findLog.log_id,
        code_snippet: findLog.code_snippet,
        message: findLog.message,
        context: findLog.context[0],
        level: findLog.level,
        ide_handle: findLog.ide_handle,
        created_at: findLog.created_at
    };

    const sfDumpId = findLog.context[1];

    nextTick(() => {
        const sfDump = document.getElementById(`sf-dump-${sfDumpId}`);

        if (sfDump && !sfDump.hasAttribute("has-dump-js")) {
            sfDump.setAttribute("has-dump-js", "true");
            window.Sfdump(`sf-dump-${sfDumpId}`);
        }

        const toggle = document.getElementById("my-drawer") as HTMLInputElement;
        if (toggle) {
            toggle.checked = true;
        }
    });
};

onMounted(() => {
    setInterval(() => {
        forceUpdate.value++;
        window.addEventListener("keydown", handleEscape);
    }, 60_000);
});

onBeforeUnmount(() => {
    window.removeEventListener("keydown", handleEscape);
});

const handleEscape = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
        const drawerToggle = document.getElementById("my-drawer") as HTMLInputElement;
        if (drawerToggle) {
            drawerToggle.checked = false;
            selected.value = null;
        }
    }
};
</script>

<template>
    <div class="px-3">
        <div class="drawer drawer-end">
            <input
                id="my-drawer"
                type="checkbox"
                class="drawer-toggle hidden"
            />

            <div class="drawer-side z-[400]">
                <label
                    for="my-drawer"
                    class="drawer-overlay"
                ></label>
                <div class="bg-base-200 text-base-content min-h-full w-[calc(100vw-120px)] p-5">
                    <div
                        class="space-y-3"
                        v-if="selected"
                    >
                        <div class="flex justify-between nav-bar mb-0">
                            <h4 class="text-base font-semibold">Created At</h4>
                            <span class="text-sm">{{ moment(selected.created_at).format("HH:mm:ss a") }}</span>
                        </div>
                        <Divider />

                        <div>
                            <h4 class="nav-bar text-base font-semibold">Message</h4>
                            <span class="text-sm">{{ selected.message }}</span>
                        </div>
                        <Divider />

                        <div v-if="selected.code_snippet.length > 0">
                            <h4 class="text-base font-semibold">Code Snippet</h4>
                            <CodeSnippet
                                v-if="selected.code_snippet.length > 0"
                                :code_snippet="selected.code_snippet"
                                :ide_handle="selected.ide_handle"
                            />
                        </div>
                        <div v-else>
                            <h4 class="nav-bar text-base font-semibold">Payload</h4>
                            <div v-html="selected.context"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div :class="{ 'h-[calc(100vh-100px)]': inScreenWindow, 'h-[calc(100vh-150px)]': !inScreenWindow }">
            <div class="flex items-center gap-1 justify-end">
                <div class="flex w-full justify-center">
                    <Teleport to="#actions">
                        <button class="btn btn-sm p-[0.5rem]">
                            <FunnelIcon class="w-4" />
                        </button>
                        <button
                            @click="pauseLogsStore.toggle()"
                            class="btn btn-sm p-[0.5rem]"
                            :data-tippy-content="$t('pause')"
                        >
                            <PlayIcon
                                v-if="pauseLogsStore.is_paused"
                                class="w-4 text-warning"
                            />
                            <IconPause
                                v-else
                                class="w-4"
                            />
                        </button>
                        <button
                            @click="clear()"
                            class="btn btn-sm p-[0.5rem]"
                            data-tippy-content="Clear"
                        >
                            <TrashIcon class="w-4" />
                        </button>
                    </Teleport>
                </div>
            </div>

            <div
                v-if="logs.length > 0"
                class="overflow-auto"
                style="height: -webkit-fill-available"
            >
                <table class="table table-pin-rows table-zebra">
                    <thead>
                        <tr class="text-xs !bg-base-300 font-light text-base-content">
                            <th class="w-4">Level</th>
                            <th>Message</th>
                        </tr>
                    </thead>
                    <tbody>
                        <template
                            v-for="(logsOnTime, timeKey) in groupedLogsByRelativeTime"
                            :key="timeKey"
                        >
                            <tr
                                class="bg-base-200 text-xs font-semibold text-center cursor-pointer"
                                @click="toggleLogGroup(timeKey)"
                            >
                                <td
                                    colspan="3"
                                    class="select-none hover:link"
                                >
                                    {{ timeKey }}
                                    <span class="ml-1">{{ collapsedLogGroups[timeKey] ? "▼" : "▲" }}</span>
                                </td>
                            </tr>
                            <tr
                                v-for="(log, index) in logsOnTime"
                                v-if="!collapsedLogGroups[timeKey]"
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
                                    />
                                </td>
                            </tr>
                        </template>
                    </tbody>
                </table>
            </div>

            <div
                v-else
                class="-ml-8 absolute flex items-center justify-center w-full"
                style="height: -webkit-fill-available"
            >
                <SvgEmpty class="w-30 opacity-25" />
                <div class="text-base-content/70">
                    <h1 class="text-lg font-semibold mb-2">Empty</h1>
                </div>
            </div>
        </div>
    </div>
</template>
<style scoped>
@reference "./../../styles.css";

::v-deep(.table thead) {
    :where(th, td) {
        @apply p-2;
    }
}

::v-deep(.table tbody) {
    :where(th, td) {
        @apply p-1.5 px-2;
    }
}
</style>
