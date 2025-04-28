<script setup lang="ts">
import { SignalSlashIcon, TrashIcon } from "@heroicons/vue/24/outline";
import { SignalIcon } from "@heroicons/vue/24/solid";
import { computed, onMounted, ref, watch } from "vue";
import JSConfetti from "js-confetti";
import { useCurrentProject } from "@/store/current-project";
import { useXDebug } from "@/store/xdebug";
import { XDebugYml } from "@/types/XDebug";
import { IpcRendererEvent } from "electron";

const xDebugStore = useXDebug();

interface Project {
    path: string;
    project: string;
}

interface Environment {
    id: number;
    value: string;
    selected: boolean;
}

const isDropdownOpen = ref(false);
const isXdebugActive = ref(false);
const selectedProject = ref<Project>({} as Project);
const isNewProject = ref(false);
const projects = ref<Project[]>([]);
const environments = ref<Environment[]>([]);

const currentProjectStore = useCurrentProject();

const handleProjectAdded = (_: IpcRendererEvent, project: Project) => {
    window.ipcRenderer.send("storage.get");
    const jsConfetti = new JSConfetti();
    jsConfetti.addConfetti();
    isNewProject.value = true;

    setActiveProject(project);
    setTimeout(() => (isNewProject.value = false), 5000);
};

const handleActiveProjectSet = (_: IpcRendererEvent, project: Project) => {
    setActiveProject(project);
    window.ipcRenderer.send("storage.get-environments", project.path);
};

const handleProjectsRetrieved = (_: IpcRendererEvent, storedProjects: Record<string, string>) => {
    const projectsArray = Object.keys(storedProjects).map((key) => ({
        project: key,
        path: storedProjects[key]
    }));

    projects.value = projectsArray;

    if (projectsArray.length > 0) {
        const foundProject = projectsArray.find((p) => p.path === currentProjectStore.projectInfo.path);
        if (foundProject) {
            selectedProject.value = foundProject;
            currentProjectStore.set(foundProject);
            window.ipcRenderer.send("storage.get-environments", foundProject.path);
        }
    }
};

const handleEnvironmentsRetrieved = (_: IpcRendererEvent, environmentsData: Environment[]) => {
    if (!environmentsData) return;

    environments.value = environmentsData.map((entry: Environment) => ({
        id: entry.id,
        value: entry.value,
        selected: entry.selected
    }));

    environments.value.forEach((env) => {
        if (!["dump", "enabled_in_testing", "original_dump", "auto_invoke_app"].includes(env.value)) {
            window.dispatchEvent(new CustomEvent("add-screen", { detail: env }));
        }
    });
};

const setActiveProject = (project: Project) => {
    currentProjectStore.set(project);
    selectedProject.value = project;
    window.ipcRenderer.send("storage.get-environments", project.path);
};

const initializeProjectData = () => {
    isXdebugActive.value = !!xDebugStore.current.project_path;

    if (currentProjectStore.projectInfo) {
        selectedProject.value = currentProjectStore.projectInfo;
        window.ipcRenderer.send("storage.get-environments", currentProjectStore.projectInfo.path);
    }

    window.ipcRenderer.send("storage.get");
};

const setupEventListeners = () => {
    window.ipcRenderer.on("app-setting:project-added", handleProjectAdded);
    window.ipcRenderer.on("storage.set-active.reply", handleActiveProjectSet);
    window.ipcRenderer.on("storage.get.reply", handleProjectsRetrieved);
    window.ipcRenderer.on("storage.get-environments.reply", handleEnvironmentsRetrieved);
    window.ipcRenderer.on("xdebug-error", handleError);
    window.ipcRenderer.on("xdebug-connector::disconnect", disconnectFromXdebug);
    window.ipcRenderer.on("xdebug-connect-closed", () => {
        setTimeout(() => {
            isXdebugActive.value = false;
        }, 800);
    });
};

onMounted(() => {
    initializeProjectData();
    setupEventListeners();
});

const handleError = (_: IpcRendererEvent, error: Error) => {
    console.error("Xdebug error:", error);
};

const selectedEnvironments = computed(() => {
    return environments.value.map((env) => ({
        value: env.value,
        selected: env.selected
    }));
});

const saveEnvironment = async (env: null | Environment): Promise<void> => {
    if (!env) return;

    window.ipcRenderer.send("storage.update", {
        selected: selectedEnvironments.value,
        project: selectedProject.value.project
    });

    if (!["dump", "enabled_in_testing", "original_dump", "auto_invoke_app"].includes(env.value)) {
        window.dispatchEvent(new CustomEvent("add-screen", { detail: env }));
    }
};

const confirmProjectRemoval = () => {
    window.ipcRenderer.send("main:dialog", {
        buttons: ["Yes", "No"],
        title: "Remove Project",
        message: "Are you sure you want to remove the configuration from this Project?"
    });

    const removeHandler = (event: Event, choice: number) => {
        if (choice === 0) {
            window.ipcRenderer.send("storage.remove", currentProjectStore.projectInfo.path);
            selectedProject.value = {} as Project;
            environments.value = [];
            window.ipcRenderer.send("storage.get");
        }
        window.ipcRenderer.off("main:dialog-choice", removeHandler);
    };

    window.ipcRenderer.on("main:dialog-choice", removeHandler);
};

const connectToXdebug = () => {
    window.ipcRenderer.send("main:setting-get-xdebug-environments", selectedProject.value.path);
};

const disconnectFromXdebug = () => {
    window.ipcRenderer.send("disconnect-xdebug");
};

watch(isXdebugActive, (shouldConnect) => {
    shouldConnect ? connectToXdebug() : disconnectFromXdebug();
});

watch(xDebugStore, (store) => {
    if (store.current.project_path === "") {
        isXdebugActive.value = false;
    }
});

window.ipcRenderer.on("settings:env-xdebug-file-contents", (event: Event, config: XDebugYml) => {
    xDebugStore.setCurrent(config);
    window.ipcRenderer.send("connect-xdebug", config);
});

const formattedName = (name: string): string => {
    if (!name) return "No project selected";
    return name.replace(/[-_.]/g, " ");
};
</script>

<template>
    <div class="mr-0.5">
        <div
            class="dropdown dropdown-end dropdown-hover"
            :class="{ 'dropdown-open': isDropdownOpen }"
        >
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
                class="dropdown-content menu bg-base-100 rounded-box shadow-sm"
            >
                <div class="overflow-auto max-h-40">
                    <li
                        v-for="project in projects.filter((p) => p.project)"
                        :key="project.path"
                        @click="setActiveProject(project)"
                    >
                        <div class="flex justify-between">
                            <a
                                :class="{ 'text-primary': selectedProject.path === project.path }"
                                class="font-normal capitalize truncate !text-sm !pl-0"
                                v-text="formattedName(project.project)"
                            />
                            <TrashIcon
                                class="size-4 opacity-70 hover:opacity-100 hover:text-error"
                                @click.stop="confirmProjectRemoval"
                            />
                        </div>
                    </li>
                </div>
                <li
                    class="mt-1"
                    v-if="selectedProject.project"
                >
                    <label class="text-sm space-x-1">
                        <input
                            v-model="isXdebugActive"
                            type="checkbox"
                            class="checkbox checkbox-sm"
                            :class="{ 'checkbox-primary': isXdebugActive }"
                            @change.stop="saveEnvironment(null)"
                        />
                        <span>Xdebug</span>
                    </label>
                </li>

                <li
                    v-for="env in environments"
                    :key="env.id"
                >
                    <label
                        :title="formattedName(env.value)"
                        class="capitalize text-sm space-x-1"
                    >
                        <input
                            v-model="env.selected"
                            type="checkbox"
                            class="checkbox checkbox-sm"
                            :class="{ 'checkbox-primary': env.selected }"
                            @change.stop="saveEnvironment(env)"
                        />
                        <span class="truncate">{{ formattedName(env.value) }}</span>
                    </label>
                </li>
            </ul>
        </div>
    </div>
</template>
