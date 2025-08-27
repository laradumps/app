<script setup lang="ts">
import { SignalSlashIcon, TrashIcon, PlusIcon, StarIcon as StarOutline } from "@heroicons/vue/24/outline";
import { SignalIcon, StarIcon as StarSolid } from "@heroicons/vue/24/solid";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import JSConfetti from "js-confetti";
import { useCurrentProject } from "@/store/current-project";
import { useXDebug } from "@/store/xdebug";
import { XDebugYml } from "@/types/XDebug";
import { IpcRendererEvent } from "electron";
import { Environment } from "../../main/storage";
import SvgEmpty from "@/components/svg/SvgEmpty.vue";
import { useToastStore } from "@/store/toast";

const xDebugStore = useXDebug();
const currentProjectStore = useCurrentProject();
const toast = useToastStore();

const IPC_EVENTS = {
    STORAGE_GET: "storage.get",
    STORAGE_GET_REPLY: "storage.get.reply",
    STORAGE_SET_ACTIVE_REPLY: "storage.set-active.reply",
    STORAGE_GET_ENVIRONMENTS: "storage.get-environments",
    STORAGE_GET_ENVIRONMENTS_REPLY: "storage.get-environments.reply",
    STORAGE_GET_YAML: "storage.get-yaml",
    STORAGE_GET_YAML_REPLY: "storage.get-yaml.reply",
    STORAGE_UPDATE: "storage.update",
    STORAGE_REMOVE: "storage.remove",
    STORAGE_UPDATE_SECTION: "storage.update-section",
    STORAGE_GET_STARRED: "storage.get-starred",
    STORAGE_GET_STARRED_REPLY: "storage.get-starred.reply",
    STORAGE_TOGGLE_STARRED: "storage.toggle-starred",

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

const starredProjects = ref<string[]>([]);
let handleStarredReplyRef: ((event: IpcRendererEvent, list: string[]) => void) | null = null;

let handleYamlReplyRef: ((event: IpcRendererEvent, data: any) => void) | null = null;
let handleComposerRef: ((event: IpcRendererEvent, payload: any) => void) | null = null;
let handleXdebugClosedRef: (() => void) | null = null;
let handleXdebugFileContentsRef: ((event: Event, config: XDebugYml) => void) | null = null;
let handleProjectDirSelectedRef: ((_: any, args: any) => void) | null = null;

onMounted(() => {
    initializeProjectData();
    setupEventListeners();
    window.addEventListener("resize", updateHeight);
});

onUnmounted(() => {
    window.removeEventListener("resize", updateHeight);

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

const setupEventListeners = () => {
    window.ipcRenderer.on(IPC_EVENTS.APP_SETTING_PROJECT_ADDED, handleProjectAdded);
    window.ipcRenderer.on(IPC_EVENTS.STORAGE_SET_ACTIVE_REPLY, handleActiveProjectSet);
    window.ipcRenderer.on(IPC_EVENTS.STORAGE_GET_REPLY, handleProjectsRetrieved);
    window.ipcRenderer.on(IPC_EVENTS.STORAGE_GET_ENVIRONMENTS_REPLY, handleEnvironmentsRetrieved);

    handleStarredReplyRef = (_: IpcRendererEvent, list: string[]) => {
        if (Array.isArray(list)) starredProjects.value = list;
    };
    window.ipcRenderer.on(IPC_EVENTS.STORAGE_GET_STARRED_REPLY, handleStarredReplyRef);

    handleYamlReplyRef = (_: IpcRendererEvent, data: any) => {
        yamlConfig.value = data || {};
    };
    window.ipcRenderer.on(IPC_EVENTS.STORAGE_GET_YAML_REPLY, handleYamlReplyRef);

    // Composer auto-install progress
    handleComposerRef = (_: IpcRendererEvent, payload: any) => {
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
            setTimeout(() => {
                installActive.value = false;

                setTimeout(() => {
                    modal_navbar_listening.close();
                    toast.show("LaraDumps installed successfully.", { type: "success" });
                    isNewProject.value = true;
                }, 300);
            }, 500);
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

const connectToXdebug = () => window.ipcRenderer.send(IPC_EVENTS.MAIN_SETTING_GET_XDEBUG_ENVS, selectedProject.value.path);
const disconnectFromXdebug = () => window.ipcRenderer.send(IPC_EVENTS.DISCONNECT_XDEBUG);

watch(isXdebugActive, (active) => (active ? connectToXdebug() : disconnectFromXdebug()));
watch(xDebugStore, (store) => (isXdebugActive.value = Boolean(store.current.project_path)));

const sortedProjects = computed(() => {
    return [...projects.value].sort((a, b) => a.project.localeCompare(b.project, undefined, { sensitivity: "base" }));
});

const starredSet = computed(() => new Set(starredProjects.value));
const starredSortedProjects = computed(() => sortedProjects.value.filter((p) => p.project && starredSet.value.has(p.project)));
const regularSortedProjects = computed(() => sortedProjects.value.filter((p) => p.project && !starredSet.value.has(p.project)));

const isStarred = (projectName: string): boolean => starredSet.value.has(projectName);
const toggleStar = (projectName: string) => {
    window.ipcRenderer.send(IPC_EVENTS.STORAGE_TOGGLE_STARRED, { project: projectName });
    // Optimistic update; will be synced by reply
    if (isStarred(projectName)) {
        starredProjects.value = starredProjects.value.filter((n) => n !== projectName);
    } else {
        starredProjects.value = [...starredProjects.value, projectName];
    }
};

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
</script>

<template>
    <div>
        <button
            class="flex font-normal capitalize truncate text-xs btn btn-soft justify-between !px-2.5 !m-0 !h-6.5 gap-2"
            onclick="modal_navbar_listening.showModal()"
        >
            <span
                v-if="selectedProject.project"
                v-text="formattedName(selectedProject.project)"
            />
            <span v-else>No project selected</span>
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
            id="modal_navbar_listening"
            class="modal"
        >
            <div class="modal-box max-w-2xl !p-2">
                <!-- Error banner -->
                <div
                    v-if="installErrorMessage"
                    class="alert alert-error mb-2"
                >
                    <span>{{ installErrorMessage }}</span>
                </div>
                <ul class="menu px-0 min-h-full w-full">
                    <div class="grid grid-cols-3 gap-2">
                        <!-- Col 1: Projects -->
                        <div class="overflow-hidden space-y-2">
                            <ul class="h-full overflow-x-hidden border-r border-base-200 pr-1.5">
                                <li
                                    @click="addProject"
                                    class="w-full flex !flex-nowrap flex-row text-left items-center justify-between"
                                >
                                    <div class="w-full">
                                        <PlusIcon class="size-4 text-primary" />
                                        <span>New</span>
                                    </div>
                                </li>

                                <template v-if="starredSortedProjects.length">
                                    <li class="px-2 py-1 text-[0.65rem] uppercase tracking-wider text-base-content/50 text-left">Starred</li>
                                    <li
                                        v-for="project in starredSortedProjects"
                                        :key="project.path + '-starred'"
                                        @click="setActiveProject(project)"
                                        class="w-full flex !flex-nowrap flex-row text-left items-center justify-between"
                                        :class="{ 'rounded-sm !bg-neutral': selectedProject.path === project.path }"
                                    >
                                        <div class="w-full">
                                            <span
                                                class="font-normal capitalize text-sm truncate"
                                                :class="{ 'text-neutral-content': selectedProject.path === project.path }"
                                                v-text="formattedName(project.project)"
                                            />
                                        </div>
                                    </li>
                                    <li class="my-1"><div class="divider m-0"></div></li>
                                </template>

                                <li class="px-2 py-1 text-[0.65rem] uppercase tracking-wider text-base-content/50 text-left">All Projects</li>
                                <li
                                    v-for="project in regularSortedProjects"
                                    :key="project.path + '-regular'"
                                    @click="setActiveProject(project)"
                                    class="w-full flex !flex-nowrap flex-row text-left items-center justify-between"
                                    :class="{ 'rounded-sm !bg-neutral': selectedProject.path === project.path }"
                                >
                                    <div class="w-full">
                                        <span
                                            class="font-normal capitalize text-sm truncate"
                                            :class="{ 'text-neutral-content': selectedProject.path === project.path }"
                                            v-text="formattedName(project.project)"
                                        />
                                    </div>
                                </li>
                            </ul>
                        </div>

                        <div class="col-span-2 space-y-2">
                            <div class="text-left pl-3 w-full">
                                <div class="flex items-start justify-between gap-1 w-full">
                                    <div class="w-full truncate text-base-content/60">
                                        <span class="text-[10px] !text-base-content/60">{{ selectedProject.path }}</span>
                                    </div>

                                    <button
                                        class="btn btn-ghost btn-xs btn-circle"
                                        :title="isStarred(selectedProject.project) ? 'Unstar' : 'Star'"
                                        @click.stop="toggleStar(selectedProject.project)"
                                    >
                                        <StarSolid
                                            v-if="isStarred(selectedProject.project)"
                                            class="size-4 text-warning"
                                        />
                                        <StarOutline
                                            v-else
                                            class="size-4"
                                        />
                                    </button>

                                    <button
                                        v-if="selectedProject.path"
                                        class="btn btn-ghost btn-xs btn-circle text-error"
                                        :title="`Remove ${formattedName(selectedProject.project)}`"
                                        @click.stop="confirmProjectRemoval(selectedProject.path)"
                                    >
                                        <TrashIcon class="size-4" />
                                    </button>
                                </div>
                            </div>

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
                                <div class="text-sm overflow-auto pr-2 w-1/2">
                                    <ul>
                                        <li>
                                            <label class="space-x-1">
                                                <input
                                                    v-model="isXdebugActive"
                                                    type="checkbox"
                                                    class="checkbox checkbox-xs"
                                                    :class="{ 'checkbox-primary': isXdebugActive }"
                                                    @change.stop="saveEnvironment(null)"
                                                />
                                                <span class="text-base-content uppercase text-xs">Xdebug</span>
                                            </label>
                                        </li>

                                        <li
                                            v-for="env in environments"
                                            :key="env.id"
                                        >
                                            <label
                                                :title="formattedName(env.value)"
                                                :class="{
                                                    '!bg-neutral text-neutral-content rounded-md': activeEnvKey === env.value && env.selected
                                                }"
                                                class="capitalize space-x-1 cursor-pointer"
                                            >
                                                <input
                                                    v-model="env.selected"
                                                    type="checkbox"
                                                    class="checkbox checkbox-xs"
                                                    :class="{ 'checkbox-accent': env.selected }"
                                                    @change.stop="onEnvChange(env)"
                                                />
                                                <span
                                                    :class="{
                                                        'text-neutral-content': activeEnvKey === env.value && env.selected
                                                    }"
                                                    class="text-base-content truncate uppercase text-xs font-normal"
                                                    >{{ formattedName(env.value) }}</span
                                                >
                                            </label>
                                        </li>
                                    </ul>
                                </div>

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
                                                    <span class="text-base-content truncate uppercase text-xs">{{ formattedName(String(key)) }}</span>
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
