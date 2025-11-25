<script setup lang="ts">
import { SignalSlashIcon, ExclamationTriangleIcon } from "@heroicons/vue/24/outline";
import { SignalIcon } from "@heroicons/vue/24/solid";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import JSConfetti from "js-confetti";
import { useCurrentProject } from "@/store/current-project";
import { useXDebug } from "@/store/xdebug";
import { XDebugYml } from "@/types/XDebug";
import { IpcRendererEvent } from "electron";
import { Environment } from "../../main/storage";
import SvgEmpty from "@/components/svg/SvgEmpty.vue";
import ProjectsList from "@/components/navbar/ProjectsList.vue";
import ProjectHeader from "@/components/navbar/ProjectHeader.vue";
import EnvironmentsList from "@/components/navbar/EnvironmentsList.vue";

const emit = defineEmits(["modalOpen", "modalClose"]);
const xDebugStore = useXDebug();
const currentProjectStore = useCurrentProject();

const IPC_EVENTS = {
    STORAGE_GET: "storage.get",
    STORAGE_GET_REPLY: "storage.get.reply",
    STORAGE_SET_ACTIVE_REPLY: "storage.set-active.reply",
    STORAGE_GET_ENVIRONMENTS: "storage.get-environments",
    STORAGE_GET_ENVIRONMENTS_REPLY: "storage.get-environments.reply",
    STORAGE_SET_ENVIRONMENTS_ORDER: "storage.set-environments-order",
    STORAGE_GET_YAML: "storage.get-yaml",
    STORAGE_GET_YAML_REPLY: "storage.get-yaml.reply",
    STORAGE_UPDATE: "storage.update",
    STORAGE_REMOVE: "storage.remove",
    STORAGE_UPDATE_SECTION: "storage.update-section",
    STORAGE_GET_STARRED: "storage.get-starred",
    STORAGE_GET_STARRED_REPLY: "storage.get-starred.reply",
    STORAGE_TOGGLE_STARRED: "storage.toggle-starred",
    STORAGE_SET_PROJECTS_ORDER: "storage.set-projects-order",
    STORAGE_GET_PROJECTS_ORDER: "storage.get-projects-order",

    APP_SETTING_PROJECT_ADDED: "app-setting:project-added",

    MAIN_DIALOG: "main:dialog",
    MAIN_DIALOG_CHOICE: "main:dialog-choice",

    PROJECT_DIRECTORY_SELECTED: "project-directory-selected",
    COMPOSER_AUTO_INSTALL: "composer-auto-install",

    XDEBUG_ERROR: "xdebug-error",
    XDEBUG_CONNECTOR_DISCONNECT: "xdebug-connector::disconnect",
    XDEBUG_CONNECT_CLOSED: "xdebug-connect-closed",
    SETTINGS_ENV_XDEBUG_FILE_CONTENTS: "settings:env-xdebug-file-contents",
    CONNECT_XDEBUG: "connect-xdebug",
    DISCONNECT_XDEBUG: "disconnect-xdebug",
    MAIN_SETTING_GET_XDEBUG_ENVS: "main:setting-get-xdebug-environments",

    ADD_SCREEN_CUSTOM_EVENT: "add-screen",
    MAIN_PROJECT_SETUP: "main:project-setup"
} as const;

interface Project {
    path: string;
    project: string;
}

const isXdebugActive = ref(false);
const selectedProject = ref<Project>({} as Project);
const isNewProject = ref(false);
const projects = ref<Project[]>([]);
const environments = ref<Environment[]>([]);
const windowHeight = ref(window.innerHeight);

const yamlConfig = ref<Record<string, any>>({});
const activeEnvKey = ref<string | null>(null);

const installActive = ref(false);
const installErrorMessage = ref("");

let errorDismissTimer: number | null = null;

watch(installErrorMessage, (msg) => {
    if (errorDismissTimer) {
        clearTimeout(errorDismissTimer);
        errorDismissTimer = null;
    }
    if (msg) {
        errorDismissTimer = window.setTimeout(() => {
            installErrorMessage.value = "";
        }, 3000);
    }
});

const starredProjects = ref<string[]>([]);
const projectsOrder = ref<{ starred: string[]; all: string[] }>({ starred: [], all: [] });
let handleStarredReplyRef: ((event: IpcRendererEvent, list: string[]) => void) | null = null;
let handleProjectsOrderReply: ((event: IpcRendererEvent, payload: { starred: string[]; all: string[] }) => void) | null = null;

let handleYamlReplyRef: ((event: IpcRendererEvent, data: any) => void) | null = null;
let handleComposerRef: ((event: IpcRendererEvent, payload: any) => void) | null = null;
let handleXdebugClosedRef: (() => void) | null = null;
let handleXdebugFileContentsRef: ((event: Event, config: XDebugYml) => void) | null = null;
let handleProjectDirSelectedRef: ((_: any, args: any) => void) | null = null;

onMounted(() => {
    initializeProjectData();
    setupEventListeners();
    window.addEventListener("resize", updateHeight);
    window.ipcRenderer.send(IPC_EVENTS.STORAGE_GET_PROJECTS_ORDER);
});

onUnmounted(() => {
    window.removeEventListener("resize", updateHeight);

    if (errorDismissTimer) {
        clearTimeout(errorDismissTimer);
        errorDismissTimer = null;
    }

    window.ipcRenderer.off(IPC_EVENTS.APP_SETTING_PROJECT_ADDED, handleProjectAdded);
    window.ipcRenderer.off(IPC_EVENTS.STORAGE_SET_ACTIVE_REPLY, handleActiveProjectSet);
    window.ipcRenderer.off(IPC_EVENTS.STORAGE_GET_REPLY, handleProjectsRetrieved);
    window.ipcRenderer.off(IPC_EVENTS.STORAGE_GET_ENVIRONMENTS_REPLY, handleEnvironmentsRetrieved);
    if (handleYamlReplyRef) window.ipcRenderer.off(IPC_EVENTS.STORAGE_GET_YAML_REPLY, handleYamlReplyRef);
    if (handleComposerRef) window.ipcRenderer.off(IPC_EVENTS.COMPOSER_AUTO_INSTALL, handleComposerRef);
    window.ipcRenderer.off(IPC_EVENTS.XDEBUG_ERROR, onXdebugError);
    window.ipcRenderer.off(IPC_EVENTS.XDEBUG_CONNECTOR_DISCONNECT, disconnectFromXdebug);
    if (handleXdebugClosedRef) window.ipcRenderer.off(IPC_EVENTS.XDEBUG_CONNECT_CLOSED, handleXdebugClosedRef);
    if (handleXdebugFileContentsRef) window.ipcRenderer.off(IPC_EVENTS.SETTINGS_ENV_XDEBUG_FILE_CONTENTS, handleXdebugFileContentsRef);
    if (handleProjectDirSelectedRef) window.ipcRenderer.off(IPC_EVENTS.PROJECT_DIRECTORY_SELECTED, handleProjectDirSelectedRef);
    if (handleStarredReplyRef) window.ipcRenderer.off(IPC_EVENTS.STORAGE_GET_STARRED_REPLY, handleStarredReplyRef);
    window.ipcRenderer.off(IPC_EVENTS.STORAGE_GET_PROJECTS_ORDER, handleProjectsOrderReply);
});

const updateHeight = () => {
    windowHeight.value = window.innerHeight;
};

const formattedName = (name: string): string => name?.replace(/[-_.]/g, " ") || "";

const handleProjectAdded = (_: IpcRendererEvent, project: Project) => {
    window.ipcRenderer.send(IPC_EVENTS.STORAGE_GET);
    new JSConfetti().addConfetti();
    isNewProject.value = true;
    setActiveProject(project);
    setTimeout(() => (isNewProject.value = false), 5000);
};

const handleActiveProjectSet = (_: IpcRendererEvent, project: Project) => {
    setActiveProject(project);
    window.ipcRenderer.send(IPC_EVENTS.STORAGE_GET_ENVIRONMENTS, project.path);
    window.ipcRenderer.send(IPC_EVENTS.STORAGE_GET_YAML, project.path);
};

const handleProjectsRetrieved = (_: IpcRendererEvent, storedProjects: Record<string, string>) => {
    const projectsArray = Object.entries(storedProjects).map(([project, path]) => ({ project, path }));
    projects.value = projectsArray;

    const found = projectsArray.find((p) => p.path === currentProjectStore.projectInfo.path);
    if (found) {
        setActiveProject(found);
    }
};

const handleEnvironmentsRetrieved = (_: IpcRendererEvent, envs: Environment[]) => {
    if (!envs) return;

    environments.value = envs.map((env) => ({ ...env }));

    environments.value.forEach((env) => {
        if (!ignoredEnvironment(env.value)) {
            window.dispatchEvent(new CustomEvent(IPC_EVENTS.ADD_SCREEN_CUSTOM_EVENT, { detail: env }));
        }
    });
};

const setActiveProject = (project: Project) => {
    currentProjectStore.set(project);
    selectedProject.value = project;
    window.ipcRenderer.send(IPC_EVENTS.STORAGE_GET_ENVIRONMENTS, project.path);
    window.ipcRenderer.send(IPC_EVENTS.STORAGE_GET_YAML, project.path);
    activeEnvKey.value = null;
};

const ignoredEnvironment = (value: string): boolean => ["dump", "enabled_in_testing", "original_dump", "auto_invoke_app"].includes(value);

const initializeProjectData = () => {
    isXdebugActive.value = Boolean(xDebugStore.current.project_path);

    if (currentProjectStore.projectInfo) {
        setActiveProject(currentProjectStore.projectInfo);
    }

    window.ipcRenderer.send(IPC_EVENTS.STORAGE_GET);
    window.ipcRenderer.send(IPC_EVENTS.STORAGE_GET_STARRED);
};

const onXdebugError = (_: IpcRendererEvent, error: Error) => console.error("Xdebug error:", error);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const setupEventListeners = async () => {
    window.ipcRenderer.on(IPC_EVENTS.APP_SETTING_PROJECT_ADDED, handleProjectAdded);
    window.ipcRenderer.on(IPC_EVENTS.STORAGE_SET_ACTIVE_REPLY, handleActiveProjectSet);
    window.ipcRenderer.on(IPC_EVENTS.STORAGE_GET_REPLY, handleProjectsRetrieved);
    window.ipcRenderer.on(IPC_EVENTS.STORAGE_GET_ENVIRONMENTS_REPLY, handleEnvironmentsRetrieved);

    handleProjectsOrderReply = (_: IpcRendererEvent, payload: { starred: string[]; all: string[] }) => {
        if (payload && payload.starred && payload.all) {
            projectsOrder.value = {
                starred: Array.isArray(payload.starred) ? payload.starred : [],
                all: Array.isArray(payload.all) ? payload.all : []
            };
        }
    };
    window.ipcRenderer.on(IPC_EVENTS.STORAGE_GET_PROJECTS_ORDER, handleProjectsOrderReply);

    handleStarredReplyRef = (_: IpcRendererEvent, list: string[]) => {
        if (Array.isArray(list)) starredProjects.value = list;
    };
    window.ipcRenderer.on(IPC_EVENTS.STORAGE_GET_STARRED_REPLY, handleStarredReplyRef);

    handleYamlReplyRef = (_: IpcRendererEvent, data: any) => {
        yamlConfig.value = data || {};
    };
    window.ipcRenderer.on(IPC_EVENTS.STORAGE_GET_YAML_REPLY, handleYamlReplyRef);

    // --- Composer auto-install progress
    handleComposerRef = async (_: IpcRendererEvent, payload: any) => {
        if (!payload) return;

        if (payload.status === "start") {
            installActive.value = true;
            installErrorMessage.value = "";
        }

        if (payload.error) {
            installErrorMessage.value = "An error occurred while installing.";
            installActive.value = false;
            return;
        }

        if (payload.step === "finish" && payload.done) {
            await sleep(500);
            installActive.value = false;

            await sleep(300);
            modal_navbar_listening.close();
            await new JSConfetti().addConfetti();
            isNewProject.value = true;
        }
    };

    window.ipcRenderer.on(IPC_EVENTS.COMPOSER_AUTO_INSTALL, handleComposerRef);
    window.ipcRenderer.on(IPC_EVENTS.XDEBUG_ERROR, onXdebugError);
    window.ipcRenderer.on(IPC_EVENTS.XDEBUG_CONNECTOR_DISCONNECT, disconnectFromXdebug);

    handleXdebugClosedRef = () => setTimeout(() => (isXdebugActive.value = false), 800);

    window.ipcRenderer.on(IPC_EVENTS.XDEBUG_CONNECT_CLOSED, handleXdebugClosedRef);

    handleXdebugFileContentsRef = (_: Event, config: XDebugYml) => {
        xDebugStore.setCurrent(config);
        window.ipcRenderer.send(IPC_EVENTS.CONNECT_XDEBUG, config);
    };

    window.ipcRenderer.on(IPC_EVENTS.SETTINGS_ENV_XDEBUG_FILE_CONTENTS, handleXdebugFileContentsRef);
};

handleProjectDirSelectedRef = (_: any, args: any) => {
    if (args && typeof args === "string") {
        window.ipcRenderer.send("storage.check", { applicationPath: args });
    }
};

window.ipcRenderer.on(IPC_EVENTS.PROJECT_DIRECTORY_SELECTED, handleProjectDirSelectedRef);

const selectedEnvironments = computed(() => environments.value.map(({ value, selected }) => ({ value, selected })));

const saveEnvironment = async (env: Environment | null): Promise<void> => {
    if (!env) return;

    window.ipcRenderer.send(IPC_EVENTS.STORAGE_UPDATE, {
        selected: selectedEnvironments.value,
        path: currentProjectStore.projectInfo.path
    });

    if (!ignoredEnvironment(env.value)) {
        window.dispatchEvent(new CustomEvent(IPC_EVENTS.ADD_SCREEN_CUSTOM_EVENT, { detail: env }));
    }
};

const confirmProjectRemoval = (projectPath: string) => {
    window.ipcRenderer.send(IPC_EVENTS.MAIN_DIALOG, {
        buttons: ["Yes", "No"],
        title: "Remove Project",
        message: "Are you sure you want to remove the configuration from this Project?"
    });

    const removeHandler = (_: Event, choice: number) => {
        if (choice === 0) {
            window.ipcRenderer.send(IPC_EVENTS.STORAGE_REMOVE, projectPath);
            window.ipcRenderer.send(IPC_EVENTS.STORAGE_GET);

            const [firstProject] = projects.value;
            if (firstProject) {
                setActiveProject(firstProject);
            }
        }
        window.ipcRenderer.off(IPC_EVENTS.MAIN_DIALOG_CHOICE, removeHandler);
    };

    window.ipcRenderer.on(IPC_EVENTS.MAIN_DIALOG_CHOICE, removeHandler);
};

// --- Xdebug connection management

const connectToXdebug = () => window.ipcRenderer.send(IPC_EVENTS.MAIN_SETTING_GET_XDEBUG_ENVS, selectedProject.value.path);
const disconnectFromXdebug = () => window.ipcRenderer.send(IPC_EVENTS.DISCONNECT_XDEBUG);

watch(isXdebugActive, (active) => (active ? connectToXdebug() : disconnectFromXdebug()));
watch(xDebugStore, (store) => (isXdebugActive.value = Boolean(store.current.project_path)));

const baseSortedProjects = computed(() => {
    return [...projects.value].sort((a, b) => a.project.localeCompare(b.project, undefined, { sensitivity: "base" }));
});
// --- End Xdebug connection management

// --- Starred projects logic
const starredSet = computed(() => new Set(starredProjects.value));

const applyOrder = (list: Project[], order: string[]): Project[] => {
    if (!order || order.length === 0) return list;
    const idx = new Map<string, number>();
    order.forEach((name, i) => idx.set(name, i));
    return [...list].sort((a, b) => {
        const ai = idx.has(a.project) ? (idx.get(a.project) as number) : Number.MAX_SAFE_INTEGER;
        const bi = idx.has(b.project) ? (idx.get(b.project) as number) : Number.MAX_SAFE_INTEGER;
        if (ai === bi) return a.project.localeCompare(b.project, undefined, { sensitivity: "base" });
        return ai - bi;
    });
};

const starredSortedProjects = computed(() => {
    const list = baseSortedProjects.value.filter((p) => p.project && starredSet.value.has(p.project));
    return applyOrder(list, projectsOrder.value.starred);
});

const regularSortedProjects = computed(() => {
    const list = baseSortedProjects.value.filter((p) => p.project && !starredSet.value.has(p.project));
    return applyOrder(list, projectsOrder.value.all);
});

// --- Starred projects actions
const isStarred = (projectName: string): boolean => starredSet.value.has(projectName);
const toggleStar = (projectName: string) => {
    window.ipcRenderer.send(IPC_EVENTS.STORAGE_TOGGLE_STARRED, { project: projectName });

    const wasStarred = isStarred(projectName);
    starredProjects.value = wasStarred ? starredProjects.value.filter((n) => n !== projectName) : [...starredProjects.value, projectName];

    if (wasStarred) {
        projectsOrder.value.starred = projectsOrder.value.starred.filter((n) => n !== projectName);
        if (!projectsOrder.value.all.includes(projectName)) {
            projectsOrder.value.all = [...projectsOrder.value.all, projectName];
        }
        window.ipcRenderer.send(IPC_EVENTS.STORAGE_SET_PROJECTS_ORDER, { list: "starred", order: projectsOrder.value.starred });
        window.ipcRenderer.send(IPC_EVENTS.STORAGE_SET_PROJECTS_ORDER, { list: "all", order: projectsOrder.value.all });
    } else {
        projectsOrder.value.all = projectsOrder.value.all.filter((n) => n !== projectName);
        if (!projectsOrder.value.starred.includes(projectName)) {
            projectsOrder.value.starred = [...projectsOrder.value.starred, projectName];
        }
        window.ipcRenderer.send(IPC_EVENTS.STORAGE_SET_PROJECTS_ORDER, { list: "all", order: projectsOrder.value.all });
        window.ipcRenderer.send(IPC_EVENTS.STORAGE_SET_PROJECTS_ORDER, { list: "starred", order: projectsOrder.value.starred });
    }
};
// --- End starred projects logic

const activeOptions = computed(() => {
    if (!activeEnvKey.value || !yamlConfig.value) return null;
    const section = (yamlConfig.value as any)[activeEnvKey.value];
    if (!section || typeof section !== "object") return null;
    return section;
});

const onEnvChange = (env: Environment) => {
    saveEnvironment(env);
    if (env.selected) {
        activeEnvKey.value = env.value;
    } else if (activeEnvKey.value === env.value) {
        activeEnvKey.value = null;
    }
};

// --- Drag & Drop to reorder environments
const dragIndex = ref<number | null>(null);

const onEnvDragStart = (index: number) => {
    dragIndex.value = index;
};

const onEnvDrop = (dropIndex: number) => {
    if (dragIndex.value === null || dragIndex.value === dropIndex) return;
    const from = dragIndex.value;
    const to = dropIndex;
    const arr = [...environments.value];
    const [moved] = arr.splice(from, 1);
    arr.splice(to, 0, moved);
    environments.value = arr;
    dragIndex.value = null;

    // Persist order per project
    try {
        const order = environments.value.map((e) => e.value);
        window.ipcRenderer.send(IPC_EVENTS.STORAGE_SET_ENVIRONMENTS_ORDER, {
            path: currentProjectStore.projectInfo.path,
            order
        });
    } catch (e) {
        console.error("Failed to persist environments order", e);
    }
};

const onEnvDragOver = (e: DragEvent) => {
    e.preventDefault();
};

// --- Drag & Drop to reorder projects (starred and all)
const projDrag = ref<{ list: "starred" | "all" | null; index: number | null }>({ list: null, index: null });

const onProjectDragStart = (list: "starred" | "all", index: number) => {
    projDrag.value = { list, index };
};

const onProjectDrop = (list: "starred" | "all", dropIndex: number) => {
    const { list: fromList, index } = projDrag.value;
    if (!fromList || index === null || fromList !== list) return; // only allow reorder within same list

    const working = list === "starred" ? [...projectsOrder.value.starred] : [...projectsOrder.value.all];

    // Build current names list from visible computed lists to ensure we reorder by names
    const visible = (list === "starred" ? starredSortedProjects.value : regularSortedProjects.value).map((p) => p.project);

    // Ensure working contains all visible in order; if not, initialize with visible
    const currentOrder = working.length ? working.filter((n) => visible.includes(n)) : visible.slice();

    const [moved] = currentOrder.splice(index, 1);
    currentOrder.splice(dropIndex, 0, moved);

    if (list === "starred") {
        projectsOrder.value.starred = currentOrder;
    } else {
        projectsOrder.value.all = currentOrder;
    }

    window.ipcRenderer.send(IPC_EVENTS.STORAGE_SET_PROJECTS_ORDER, {
        list,
        order: currentOrder
    });

    projDrag.value = { list: null, index: null };
};

const updateSectionValue = (key: string, value: any) => {
    if (!activeEnvKey.value) return;

    if (!yamlConfig.value[activeEnvKey.value]) yamlConfig.value[activeEnvKey.value] = {};
    yamlConfig.value[activeEnvKey.value][key] = value;

    window.ipcRenderer.send(IPC_EVENTS.STORAGE_UPDATE_SECTION, {
        path: currentProjectStore.projectInfo.path,
        section: activeEnvKey.value,
        values: { [key]: value }
    });
};

const addProject = () => {
    window.ipcRenderer.send(IPC_EVENTS.MAIN_PROJECT_SETUP);
};

const toggleXdebug = () => {
    isXdebugActive.value = !isXdebugActive.value;
    saveEnvironment(null);
};

const showModal = () => {
    modal_navbar_listening.showModal();
    emit("modalOpen");
};
const closeModal = () => {
    emit("modalClose");
}
</script>

<template>
    <div>
        <button
            class="flex font-normal capitalize truncate text-xs btn btn-soft justify-between !px-2.5 !m-0 !h-6.5 gap-2"
            @click="showModal()"
        >
            <span
                v-if="selectedProject.project"
                v-text="formattedName(selectedProject.project)"
            />
            <span v-else>{{ $t("no_project_selected") }}</span>
            <SignalSlashIcon
                v-if="!selectedProject.project"
                class="size-4 text-error"
            />
            <SignalIcon
                v-else
                :class="{ 'animate-pulse': isNewProject, 'text-primary': selectedProject.project }"
                class="size-4"
            />
        </button>
        <dialog
            @close="closeModal"
            id="modal_navbar_listening"
            class="modal z-[200]"
        >
            <div class="modal-box max-w-2xl !p-2">
                <!-- Error banner -->
                <div
                    v-if="installErrorMessage"
                    role="alert"
                    class="alert alert-error"
                >
                    <ExclamationTriangleIcon class="size-6 shrink-0" />
                    <span>{{ installErrorMessage }}</span>
                </div>

                <ul class="menu px-0 min-h-full w-full">
                    <div class="grid grid-cols-3 gap-2">
                        <!-- Col 1: Projects -->
                        <ProjectsList
                            :starred-sorted-projects="starredSortedProjects"
                            :regular-sorted-projects="regularSortedProjects"
                            :selected-project="selectedProject"
                            @add-project="addProject"
                            @set-active-project="setActiveProject"
                            @on-project-drag-start="onProjectDragStart"
                            @on-project-drop="onProjectDrop"
                        />

                        <div class="col-span-2 space-y-2">
                            <ProjectHeader
                                :project="selectedProject"
                                :is-starred="isStarred"
                                @toggle-star="toggleStar"
                                @confirm-project-removal="confirmProjectRemoval"
                            />

                            <!-- Installing overlay/content -->
                            <div
                                v-if="installActive"
                                class="absolute top-0 left-0 w-full h-full bg-base-200/90 z-10 flex flex-col items-center justify-center"
                            >
                                <div class="text-center space-y-2">
                                    <h2 class="text-lg font-semibold text-base-content/70">{{ $t("installing") }}</h2>
                                    <p class="text-base-content/70 mt-6">{{ $t("installing_wait_message") }}</p>
                                    <progress class="progress w-56 progress-info"></progress>
                                </div>
                            </div>

                            <div
                                class="flex gap-2 w-full divide-x divide-base-200 h-full"
                                v-else-if="selectedProject.project"
                                style="height: calc(-200px + 100vh)"
                            >
                                <!-- Col 2: Observers/Environments -->
                                <EnvironmentsList
                                    :environments="environments"
                                    :active-env-key="activeEnvKey"
                                    :is-xdebug-active="isXdebugActive"
                                    @on-env-change="onEnvChange"
                                    @on-env-drag-start="onEnvDragStart"
                                    @on-env-drop="onEnvDrop"
                                    @save-environment="saveEnvironment"
                                    @toggle-xdebug="toggleXdebug"
                                />

                                <!-- Col 3: Options for selected item -->
                                <div class="text-sm overflow-auto w-auto">
                                    <ul v-if="activeEnvKey && activeOptions">
                                        <li
                                            v-for="(val, key) in activeOptions"
                                            :key="key"
                                            class="mb-1"
                                        >
                                            <template v-if="typeof val === 'boolean'">
                                                <label class="space-x-1 capitalize">
                                                    <input
                                                        type="checkbox"
                                                        class="checkbox checkbox-xs"
                                                        :class="{ 'checkbox-accent': val }"
                                                        :checked="val"
                                                        @change="updateSectionValue(key as string, !(val as boolean))"
                                                    />
                                                    <span class="text-base-content truncate">{{ formattedName(String(key)) }}</span>
                                                </label>
                                            </template>
                                            <template v-else-if="typeof val === 'number'">
                                                <div class="flex items-start gap-1 flex-col w-full">
                                                    <span class="capitalize text-base-content text-sm">{{ formattedName(String(key)) }}</span>
                                                    <input
                                                        type="number"
                                                        class="input input-bordered input-xs w-24"
                                                        :value="val"
                                                        @change="(e: any) => updateSectionValue(key as string, Number(e.target.value))"
                                                    />
                                                </div>
                                            </template>
                                            <template v-else>
                                                <div class="flex items-start gap-1 flex-col w-full">
                                                    <span class="capitalize text-base-content text-sm">{{ formattedName(String(key)) }}</span>
                                                    <input
                                                        type="text"
                                                        class="input input-bordered input-xs w-full"
                                                        :value="String(val)"
                                                        @change="(e: any) => updateSectionValue(key as string, String(e.target.value))"
                                                    />
                                                </div>
                                            </template>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            <div
                                v-else
                                class="flex flex-row items-center justify-center h-[calc(100vh-14rem)] gap-2 text-center text-base-content/50"
                            >
                                <SvgEmpty class="w-22 opacity-25" />
                                <div class="text-base-content/70">
                                    <h1 class="text-base font-semibold mb-2">No Project Selected</h1>
                                </div>
                            </div>
                        </div>
                    </div>
                </ul>
            </div>
            <form
                method="dialog"
                class="modal-backdrop"
            >
                <button>close</button>
            </form>
        </dialog>
    </div>
</template>
