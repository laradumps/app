<script setup lang="ts">
import { SignalSlashIcon, TrashIcon } from "@heroicons/vue/24/outline";
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
    window.ipcRenderer.on("xdebug-error", (_: IpcRendererEvent, error: Error) => console.error("Xdebug error:", error));
    window.ipcRenderer.on("xdebug-connector::disconnect", disconnectFromXdebug);
    window.ipcRenderer.on("xdebug-connect-closed", () => setTimeout(() => (isXdebugActive.value = false), 800));
    window.ipcRenderer.on("settings:env-xdebug-file-contents", (_: Event, config: XDebugYml) => {
        xDebugStore.setCurrent(config);
        window.ipcRenderer.send("connect-xdebug", config);
    });
};

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
    return windowHeight.value > 690 ? "height: 530px" : `height: calc(100vh - 170px)`;
});
</script>

<template>
    <div class="mr-0.5">
        <div class="dropdown dropdown-end">
            <button class="flex font-normal capitalize truncate text-xs btn btn-soft justify-between !px-2.5 !m-0 !h-6.5 gap-2">
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

            <ul
                tabindex="0"
                class="-mr-[44px] dropdown-content menu bg-base-100 rounded-md shadow-sm"
            >
                <div class="overflow-auto">
                    <li
                        v-for="project in sortedProjects.filter((p) => p.project)"
                        :key="project.path"
                        @click="setActiveProject(project)"
                        class="group"
                        :class="{ '!bg-base-300 rounded-md': selectedProject.path === project.path }"
                    >
                        <div class="flex justify-between">
                            <span
                                class="font-normal capitalize text-xs truncate !pl-0"
                                :class="{ 'text-primary': selectedProject.path === project.path }"
                                v-text="formattedName(project.project)"
                            />

                            <TrashIcon
                                class="size-4 opacity-0 group-hover:opacity-75 text-error"
                                @click.stop="confirmProjectRemoval(project.path)"
                            />
                        </div>
                    </li>
                </div>

                <div
                    :style="environmentStyle"
                    class="text-sm rounded-lg overflow-auto"
                >
                    <li
                        v-if="selectedProject.project"
                        class="mt-1"
                    >
                        <label class="space-x-1">
                            <input
                                v-model="isXdebugActive"
                                type="checkbox"
                                class="checkbox checkbox-xs"
                                :class="{ 'checkbox-primary': isXdebugActive }"
                                @change.stop="saveEnvironment(null)"
                            />
                            <span class="text-base-content">Xdebug</span>
                        </label>
                    </li>
                    <li
                        v-for="env in environments"
                        :key="env.id"
                    >
                        <label
                            :title="formattedName(env.value)"
                            class="capitalize space-x-1"
                        >
                            <input
                                v-model="env.selected"
                                type="checkbox"
                                class="checkbox checkbox-xs"
                                :class="{ 'checkbox-primary': env.selected }"
                                @change.stop="saveEnvironment(env)"
                            />
                            <span class="text-base-content truncate">{{ formattedName(env.value) }}</span>
                        </label>
                    </li>
                </div>
            </ul>
        </div>
    </div>
</template>
