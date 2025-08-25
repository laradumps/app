<script setup lang="ts">
import { SignalSlashIcon, TrashIcon, PlusIcon } from "@heroicons/vue/24/outline";
import { SignalIcon } from "@heroicons/vue/24/solid";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import JSConfetti from "js-confetti";
import { useCurrentProject } from "@/store/current-project";
import { useXDebug } from "@/store/xdebug";
import { XDebugYml } from "@/types/XDebug";
import { IpcRendererEvent } from "electron";
import { Environment } from "../../main/storage";

const xDebugStore = useXDebug();
const currentProjectStore = useCurrentProject();

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

const yamlConfig = ref<any>({});
const activeEnvKey = ref<string | null>(null);

onMounted(() => {
    initializeProjectData();
    setupEventListeners();
    window.addEventListener("resize", updateHeight);
});

onUnmounted(() => {
    window.removeEventListener("resize", updateHeight);
});

const updateHeight = () => {
    windowHeight.value = window.innerHeight;
};

const formattedName = (name: string): string => name?.replace(/[-_.]/g, " ") || "No project selected";

const handleProjectAdded = (_: IpcRendererEvent, project: Project) => {
    window.ipcRenderer.send("storage.get");
    new JSConfetti().addConfetti();
    isNewProject.value = true;
    setActiveProject(project);
    setTimeout(() => (isNewProject.value = false), 5000);
};

const handleActiveProjectSet = (_: IpcRendererEvent, project: Project) => {
    setActiveProject(project);
    window.ipcRenderer.send("storage.get-environments", project.path);
    window.ipcRenderer.send("storage.get-yaml", project.path);
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
            window.dispatchEvent(new CustomEvent("add-screen", { detail: env }));
        }
    });
};

const setActiveProject = (project: Project) => {
    currentProjectStore.set(project);
    selectedProject.value = project;
    window.ipcRenderer.send("storage.get-environments", project.path);
    window.ipcRenderer.send("storage.get-yaml", project.path);
    activeEnvKey.value = null;
};

const ignoredEnvironment = (value: string): boolean => ["dump", "enabled_in_testing", "original_dump", "auto_invoke_app"].includes(value);

const initializeProjectData = () => {
    isXdebugActive.value = Boolean(xDebugStore.current.project_path);

    if (currentProjectStore.projectInfo) {
        setActiveProject(currentProjectStore.projectInfo);
    }

    window.ipcRenderer.send("storage.get");
};

const setupEventListeners = () => {
    window.ipcRenderer.on("app-setting:project-added", handleProjectAdded);
    window.ipcRenderer.on("storage.set-active.reply", handleActiveProjectSet);
    window.ipcRenderer.on("storage.get.reply", handleProjectsRetrieved);
    window.ipcRenderer.on("storage.get-environments.reply", handleEnvironmentsRetrieved);
    window.ipcRenderer.on("storage.get-yaml.reply", (_: IpcRendererEvent, data: any) => {
        yamlConfig.value = data || {};
    });
    window.ipcRenderer.on("xdebug-error", (_: IpcRendererEvent, error: Error) => console.error("Xdebug error:", error));
    window.ipcRenderer.on("xdebug-connector::disconnect", disconnectFromXdebug);
    window.ipcRenderer.on("xdebug-connect-closed", () => setTimeout(() => (isXdebugActive.value = false), 800));
    window.ipcRenderer.on("settings:env-xdebug-file-contents", (_: Event, config: XDebugYml) => {
        xDebugStore.setCurrent(config);
        window.ipcRenderer.send("connect-xdebug", config);
    });
};

window.ipcRenderer.on("choose-directory-reply", (_, args) => {
    if (args && typeof args === "string") {
        window.ipcRenderer.send("storage.check", { applicationPath: args });
    }
});

const selectedEnvironments = computed(() => environments.value.map(({ value, selected }) => ({ value, selected })));

const saveEnvironment = async (env: Environment | null): Promise<void> => {
    if (!env) return;

    window.ipcRenderer.send("storage.update", {
        selected: selectedEnvironments.value,
        path: currentProjectStore.projectInfo.path
    });

    if (!ignoredEnvironment(env.value)) {
        window.dispatchEvent(new CustomEvent("add-screen", { detail: env }));
    }
};

const confirmProjectRemoval = (projectPath: string) => {
    window.ipcRenderer.send("main:dialog", {
        buttons: ["Yes", "No"],
        title: "Remove Project",
        message: "Are you sure you want to remove the configuration from this Project?"
    });

    const removeHandler = (_: Event, choice: number) => {
        if (choice === 0) {
            window.ipcRenderer.send("storage.remove", projectPath);
            window.ipcRenderer.send("storage.get");

            const [firstProject] = projects.value;
            if (firstProject) {
                setActiveProject(firstProject);
            }
        }
        window.ipcRenderer.off("main:dialog-choice", removeHandler);
    };

    window.ipcRenderer.on("main:dialog-choice", removeHandler);
};

const connectToXdebug = () => window.ipcRenderer.send("main:setting-get-xdebug-environments", selectedProject.value.path);
const disconnectFromXdebug = () => window.ipcRenderer.send("disconnect-xdebug");

watch(isXdebugActive, (active) => (active ? connectToXdebug() : disconnectFromXdebug()));
watch(xDebugStore, (store) => (isXdebugActive.value = Boolean(store.current.project_path)));

const sortedProjects = computed(() => {
    return [...projects.value].sort((a, b) => a.project.localeCompare(b.project, undefined, { sensitivity: "base" }));
});

const environmentStyle = computed(() => {
    return windowHeight.value > 690 ? "height: 490px" : `height: calc(100vh - 170px)`;
});

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

    window.ipcRenderer.send("storage.update-section", {
        path: currentProjectStore.projectInfo.path,
        section: activeEnvKey.value,
        values: { [key]: value }
    });
};

const addProject = () => {
    window.ipcRenderer.send("main:choose-directory");
};
</script>

<template>
    <div>
        <button class="flex font-normal capitalize truncate text-xs btn btn-soft justify-between !px-2.5 !m-0 !h-6.5 gap-2" onclick="modal_navbar_listening.showModal()">
            <span v-if="selectedProject.project" v-text="formattedName(selectedProject.project)" />
            <span v-else>No project selected</span>
            <SignalSlashIcon v-if="!selectedProject.project" class="size-4 text-error" />
            <SignalIcon v-else :class="{ 'animate-pulse': isNewProject, 'text-primary': selectedProject.project }" class="size-4" />
        </button>
        <dialog id="modal_navbar_listening" class="modal">
            <div class="modal-box !p-2">
                <ul class="menu px-0 min-h-full">
                    <div class="grid grid-cols-3 gap-3" :style="environmentStyle">
                        <!-- Col 1: Projects -->
                        <div class="overflow-hidden pr-2 border-r border-base-200 space-y-2">
                            <div class="flex justify-between items-center">
                                <h4 class="px-2 font-semibold text-left opacity-70">Projects</h4>

                                <button class="btn btn-primary btn-xs btn-outline btn-circle" @click="addProject">
                                    <PlusIcon class="size-3" />
                                </button>
                            </div>

                            <ul class="h-full overflow-x-hidden">
                                <li
                                    v-for="project in sortedProjects.filter((p) => p.project)"
                                    :key="project.path"
                                    @click="setActiveProject(project)"
                                    class="group"
                                    :class="{ '!bg-neutral rounded-md': selectedProject.path === project.path }"
                                >
                                    <div class="w-full items-center rounded-md">
                                        <span
                                            class="font-normal capitalize text-xs truncate"
                                            :class="{ 'text-neutral-content': selectedProject.path === project.path }"
                                            v-text="formattedName(project.project)"
                                        />
                                    </div>
                                </li>
                            </ul>
                        </div>

                        <div class="col-span-2 space-y-2 border-l border-base-200">
                            <div class="text-left pl-3 w-full">
                                <div class="flex group items-start justify-between gap-2 w-full">
                                    <div class="w-full truncate">
                                        <h4 class="font-semibold text-left opacity-70 capitalize">{{ formattedName(selectedProject.project) }}</h4>
                                        <span class="text-[11px] text-base-content/60">{{ selectedProject.path }}</span>
                                    </div>

                                    <button class="btn btn-error btn-xs btn-outline btn-circle opacity-0 group-hover:opacity-100"
                                            :disabled="!selectedProject.path"
                                            :title="`Remove ${formattedName(selectedProject.project)}`"
                                            @click.stop="confirmProjectRemoval(selectedProject.path)">
                                        <TrashIcon class="size-3" />
                                    </button>
                                </div>
                            </div>

                            <div class="flex gap-3 w-full">
                                <!-- Col 2: Observers/Environments -->
                                <div class="text-sm overflow-auto pr-2">
                                    <ul>
                                        <li v-if="selectedProject.project">
                                            <label class="space-x-1">
                                                <input
                                                    v-model="isXdebugActive"
                                                    type="checkbox"
                                                    class="checkbox checkbox-xs"
                                                    :class="{ 'checkbox-primary': isXdebugActive }"
                                                    @change.stop="saveEnvironment(null)"
                                                />
                                                <span class="text-base-content text-xs">Xdebug</span>
                                            </label>
                                        </li>

                                        <li v-for="env in environments" :key="env.id">
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
                                                    class="text-base-content truncate text-xs"
                                                    >{{ formattedName(env.value) }}</span
                                                >
                                            </label>
                                        </li>
                                    </ul>
                                </div>

                                <!-- Col 3: Options for selected item -->
                                <div class="text-sm overflow-auto">
                                    <ul v-if="activeEnvKey && activeOptions">
                                        <li v-for="(val, key) in activeOptions" :key="key" class="mb-1">
                                            <template v-if="typeof val === 'boolean'">
                                                <label class="space-x-1 capitalize">
                                                    <input
                                                        type="checkbox"
                                                        class="checkbox checkbox-xs"
                                                        :class="{ 'checkbox-accent': val }"
                                                        :checked="val"
                                                        @change="updateSectionValue(key as string, !(val as boolean))"
                                                    />
                                                    <span class="text-base-content truncate text-xs">{{ formattedName(String(key)) }}</span>
                                                </label>
                                            </template>
                                            <template v-else-if="typeof val === 'number'">
                                                <div class="flex items-start gap-1 flex-col w-full">
                                                    <span class="capitalize text-base-content text-xs">{{ formattedName(String(key)) }}</span>
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
                                                    <span class="capitalize text-base-content text-xs">{{ formattedName(String(key)) }}</span>
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
                        </div>
                    </div>
                </ul>
            </div>
            <form method="dialog" class="modal-backdrop">
                <button>close</button>
            </form>
        </dialog>
    </div>
</template>
