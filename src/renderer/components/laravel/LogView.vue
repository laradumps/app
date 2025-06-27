<script setup lang="ts">
import { computed, defineProps, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import moment from "moment";
import { EyeIcon, TrashIcon, FunnelIcon } from "@heroicons/vue/24/outline";
import { ExclamationCircleIcon, MagnifyingGlassIcon, ExclamationTriangleIcon, InformationCircleIcon } from "@heroicons/vue/24/outline";

import { IdeHandle } from "@/types/IdeHandle";
import { useCurrentProject } from "@/store/current-project";
import { Log, useLogStore } from "@/store/logs";
import CodeSnippet from "@/components/CodeSnippet.vue";
import { useColorStore } from "@/store/colors";
import { useSettingsStore } from "@/store/settings";
import { useLogFilterStore } from "@/store/log-filter";
import SvgEmpty from "@/components/svg/SvgEmpty.vue";
import Divider from "@/components/common/Divider.vue";

const logStore = useLogStore();
const currentProjectStore = useCurrentProject();
const colorStore = useColorStore();
const settingsStore = useSettingsStore();
const logFilterStore = useLogFilterStore();

const search = ref("");
const forceUpdate = ref(0);
const selectedLogDetail = ref();

const logLevels = [
    { level: "info", label: "Info" },
    { level: "notice", label: "Notice" },
    { level: "error", label: "Error"},
    { level: "critical", label: "Critical"},
    { level: "emergency", label: "Emergency"},
];

const hasActiveFilters = computed(() => logFilterStore.hasFilters);

const toggleLevel = (level: string) => {
    logFilterStore.toggleLevel(level);
};

const clearFilters = () => {
    logFilterStore.clear();
};

const getLogCount = (level: string) => {
    const items = props.items ? props.items : logStore.logs;
    return Object.values(items).filter((log: Log) => log.level === level).length;
};

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
            if (logFilterStore.hasFilters) {
                return logFilterStore.isSelected(log.level);
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
    logFilterStore.clear();
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
            selectedLogDetail.value = null;
        }
    }
};
</script>

<template>
    <div class="px-3">
        <div class="drawer drawer-end">
            <input id="my-drawer" type="checkbox" class="hidden drawer-toggle" />

            <div class="drawer-side">
                <label for="my-drawer" class="drawer-overlay"></label>
                <div class="bg-base-200 text-base-content min-h-full w-[calc(100vw-120px)] p-5">
                    <div class="space-y-3" v-if="selectedLogDetail">
                        <div>
                            <h4 class="text-base font-semibold nav-bar">Message</h4>
                            <span class="text-sm">{{ selectedLogDetail.message }}</span>
                        </div>
                        <Divider />
                        <div class="h-auto overflow-auto">
                            <h4 class="text-base font-semibold nav-bar">Code Snippet / Payload</h4>
                            <CodeSnippet v-if="selectedLogDetail.code_snippet.length > 0"
                                :code_snippet="selectedLogDetail.code_snippet"
                                :ide_handle="selectedLogDetail.ide_handle" />
                            <div v-else>
                                <div v-html="selectedLogDetail.context"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="space-y-3"
            :class="{ 'h-[calc(100vh-100px)]': inScreenWindow, 'h-[calc(100vh-150px)]': !inScreenWindow }">
            <div class="flex items-center justify-between gap-1 mt-1">
                <label class="w-full input input-sm">
                    <MagnifyingGlassIcon class="size-4" />
                    <input v-model="search" type="search" class="grow" :placeholder="$t('search')" />
                </label>

                <div class="dropdown dropdown-end">
                    <div tabindex="0" role="button" class="btn btn-sm gap-2 min-h-[2rem] h-8" :class="{
                        'btn-primary': hasActiveFilters,
                        'btn-ghost': !hasActiveFilters
                    }" data-tippy-content="Filter by log level">
                        <FunnelIcon class="w-4 h-4" :class="{ 'text-primary-content': hasActiveFilters }" />
                        <span v-if="hasActiveFilters && logFilterStore.selectedCount" class="text-xs font-medium">
                            {{ logFilterStore.selectedCount }}
                        </span>
                    </div>
                    <div tabindex="0"
                        class="z-50 w-64 mt-2 border rounded-lg shadow-lg dropdown-content bg-base-100 border-base-300">
                        <div class="px-4 py-3 border-b border-base-300">
                            <div class="flex items-center justify-between">
                                <h3 class="text-sm font-semibold text-base-content">Filter by Level</h3>
                                <button v-if="hasActiveFilters" @click="clearFilters"
                                    class="text-xs font-medium text-primary hover:text-primary-focus">
                                    Clear All
                                </button>
                            </div>
                        </div>

                        <div class="p-2 overflow-y-auto max-h-80">
                            <div v-for="logLevel in logLevels" :key="logLevel.level" class="group">
                                <label
                                    class="relative flex items-center gap-3 p-3 transition-colors duration-150 rounded-lg cursor-pointer hover:bg-base-200">
                                    <div class="absolute left-0 w-1 top-2 bottom-2 rounded-r-md" :class="{
                                        'bg-info': logLevel.level === 'info',
                                        'bg-success': logLevel.level === 'notice',
                                        'bg-error': logLevel.level === 'error' || logLevel.level === 'critical' || logLevel.level === 'emergency',
                                        'bg-warning': logLevel.level === 'warning',
                                        'bg-gray-500': logLevel.level === 'debug'
                                    }">
                                    </div>

                                    <input type="checkbox" :checked="logFilterStore.isSelected(logLevel.level)"
                                        @change="toggleLevel(logLevel.level)" class="ml-2 checkbox checkbox-sm" :class="{
                                            'checkbox-primary': logFilterStore.isSelected(logLevel.level),
                                            'checkbox-ghost': !logFilterStore.isSelected(logLevel.level)
                                        }" />
                                    <div class="flex items-center flex-1 gap-2">
                                        <span class="px-2 py-1 text-xs font-medium rounded-md min-w-[60px] text-center">
                                            {{ logLevel.label }}
                                        </span>
                                        <span
                                            class="text-xs transition-colors text-base-content/70 group-hover:text-base-content">
                                            {{ getLogCount(logLevel.level) }} logs
                                        </span>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <div class="px-4 py-3 border-t border-base-300 bg-base-50">
                            <button @click="clearFilters" class="w-full btn btn-xs btn-ghost"
                                :disabled="!hasActiveFilters">
                                Clear All Filters
                            </button>
                        </div>
                    </div>
                </div>

                <button @click="clear()" class="btn btn-sm p-[0.5rem]" data-tippy-content="Clear">
                    <TrashIcon class="w-4" />
                </button>
            </div>

            <div v-if="logs.length > 0" class="overflow-auto" style="height: -webkit-fill-available">
                <table class="table">
                    <thead>
                        <tr>
                            <th class="w-4">Level</th>
                            <th>Message</th>
                            <th class="w-6">Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(log, index) in logs" :key="`log-${index}`" class="cursor-pointer hover:bg-base-100"
                            @click="openModal(log.log_id)">
                            <td>
                                <span class="badge text-xs !text-semibold badge-info p-1.5" v-if="log.level === 'info'">
                                    <InformationCircleIcon class="w-5" /> Info
                                </span>
                                <span class="text-xs badge badge-success" v-else-if="log.level === 'notice'">
                                    <InformationCircleIcon class="w-5" /> Notice
                                </span>

                                <span class="badge text-xs !text-semibold badge-warning p-1.5"
                                    v-else-if="log.level === 'warning'">
                                    <ExclamationTriangleIcon class="w-5" />
                                    Warning
                                </span>
                                <span class="badge text-xs !text-semibold badge-error p-1.5"
                                    v-else-if="log.level === 'error'">
                                    <ExclamationCircleIcon class="w-5" />Error
                                </span>
                                <span class="badge text-xs !text-semibold badge-error p-1.5"
                                    v-else-if="log.level === 'alert'">
                                    <ExclamationCircleIcon class="w-5" />Alert
                                </span>
                                <span class="badge text-xs !text-semibold badge-error p-1.5"
                                    v-else-if="log.level === 'critical'">
                                    <ExclamationTriangleIcon class="w-5" />Critical
                                </span>
                                <span class="badge text-xs !text-semibold badge-error p-1.5"
                                    v-else-if="log.level === 'emergency'">
                                    <ExclamationCircleIcon class="w-5" />Emergency
                                </span>
                                <span class="badge text-xs !text-semibold bg-gray-500 text-primary-content p-1.5"
                                    v-else-if="log.level === 'debug'">
                                    <InformationCircleIcon class="w-5" />Debug
                                </span>
                            </td>
                            <td class="break-words break-all">
                                <div class="line-clamp-2">{{ log.message }}</div>
                                <a v-if="log.ide_handle.class_name !== 'empty'" :href="generateLink(log.ide_handle)"
                                    v-text="`${log.ide_handle.class_name}:${log.ide_handle.line}`"
                                    class="text-xs link opacity-60">
                                </a>
                            </td>
                            <td class="text-right whitespace-nowrap">
                                <div class="flex flex-col">
                                    <span>{{ moment(log.created_at).fromNow() }}</span>
                                    <span class="text-xs opacity-65">{{ moment(log.created_at).format("HH:mm:ss")
                                        }}</span>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div v-else class="absolute flex items-center justify-center w-full -ml-8"
                style="height: -webkit-fill-available">
                <SvgEmpty class="opacity-25 w-30" />
                <div class="text-base-content/70">
                    <h1 class="mb-2 text-lg font-semibold">No Logs</h1>
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
