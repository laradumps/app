<script setup lang="ts">
import { SignalIcon, SignalSlashIcon } from "@heroicons/vue/24/outline";
import { computed, onMounted, ref } from "vue";
import JSConfetti from "js-confetti";
import { useCurrentProject } from "@/store/current-project";

interface Project {
    path: string;
    project: string;
}

interface Environment {
    id: number;
    value: string;
    selected: boolean;
}

const selectedProject = ref<string>("");
const newProject = ref<boolean>(false);
const projects = ref<Project[]>([]);
const environments = ref<Environment[]>([]);

const currentProjectStore = useCurrentProject();

const handleProjectAdded = () => {
    window.ipcRenderer.send("storage.get");
    const jsConfetti = new JSConfetti();
    jsConfetti.addConfetti();
    newProject.value = true;
    setTimeout(() => (newProject.value = false), 5000);
};

const handleSetActiveProject = (event, value) => {
    if (value.length > 0) {
        selectedProject.value = value;
        currentProjectStore.set(selectedProject.value);
        window.ipcRenderer.send("storage.get-environments", selectedProject.value);
    }
};

const handleStorageGet = (event, value: object) => {
    const projectsArray = Object.keys(value).map((key) => ({ project: key, path: value[key] }));

    projects.value = projectsArray;

    if (projectsArray.length > 0) {
        selectedProject.value = projectsArray[0].path;
        currentProjectStore.set(selectedProject.value);
        window.ipcRenderer.send("storage.get-environments", selectedProject.value);
    }
};

const handleGetEnvironments = (event, value) => {
    if (value != null) {
        environments.value = [];
        value.forEach((entry: Environment) => {
            environments.value.push({
                id: entry.id,
                value: entry.value,
                selected: entry.selected
            });
        });
    }
};

onMounted(async () => {
    projects.value = [];
    window.ipcRenderer.on("app-setting:project-added", handleProjectAdded);
    window.ipcRenderer.on("storage.set-active.reply", handleSetActiveProject);
    window.ipcRenderer.on("storage.get.reply", handleStorageGet);
    window.ipcRenderer.on("storage.get-environments.reply", handleGetEnvironments);
});

const selectedEnvironment = computed(() => {
    return environments.value.map((key) => {
        return {
            value: key.value,
            selected: key.selected
        };
    });
});

const save = async (): Promise<void> => {
    window.ipcRenderer.send("storage.update", {
        selected: selectedEnvironment.value,
        project: selectedProject.value
    });
};

const remove = () => {
    if (selectedProject.value !== "") {
        window.ipcRenderer.on("main:dialog-choice", (event, arg) => {
            if (arg === 0) {
                window.ipcRenderer.send("storage.remove", selectedProject.value);

                selectedProject.value = "";
                environments.value = [];

                window.ipcRenderer.emit("storage.get");
            }
        });

        window.ipcRenderer.send("main:dialog", {
            buttons: ["Yes", "No"],
            title: "Remove Project",
            message: "Are you sure you want to remove the configuration from this Project?"
        });
    }
};

const setActiveProject = () => {
    currentProjectStore.set(selectedProject.value);
    window.ipcRenderer.send("storage.get-environments", selectedProject.value);
};
</script>

<template>
    <div class="dropdown dropdown-left">
        <div
            tabindex="0"
            role="button"
            class="w-[32px] !h-[34px] tab p-1.5 py-2 hover:bg-base-200 text-base-content cursor-pointer rounded-md"
        >
            <SignalSlashIcon
                v-if="selectedProject.length === 0"
                class="size-4 text-error"
            />

            <SignalIcon
                v-else
                :class="{ 'animate-pulse': newProject, 'text-primary': selectedProject }"
                class="size-4"
            />
        </div>
        <ul
            tabindex="0"
            class="dropdown-content min-w-40 overflow-y-auto z-200 menu p-2 bg-base-200 border border-base-content/20 shadow-lg rounded-md w-auto mt-[44px] !-right-0"
        >
            <select
                v-model="selectedProject"
                @change="setActiveProject()"
                class="mb-3 select select-bordered select-xs text-base-content w-full h-[1.85rem] font-semibold max-w-xs"
            >
                <option value="">Select a project</option>

                <option
                    v-for="project in projects"
                    :ref="project.project"
                    :value="project.path"
                >
                    {{ project.project }} - {{ project.path }}
                </option>
            </select>

            <div
                v-if="environments.length === 0"
                class="text-[10px] text-base-content"
            >
                No laradumps.yaml found in this project
            </div>

            <div
                class="overflow-auto"
                style="height: calc(100vh - 11rem)"
            >
                <li
                    :key="env.value"
                    v-for="env in environments"
                >
                    <label
                        class="text-base-content label !justify-start !text-left p-1.5 my-0.5"
                        :class="{ 'bg-base-200': env.selected }"
                    >
                        <input
                            type="checkbox"
                            :name="`env-` + env.id"
                            v-model="env.selected"
                            class="toggle toggle-xs toggle-accent"
                            @change="save"
                        />
                        <span class="text-[11px] whitespace-nowrap font-semibold uppercase">{{ env.value.replaceAll("_", " ") }}</span>
                    </label>
                </li>
            </div>

            <div v-if="environments.length > 0">
                <button
                    class="btn btn-warning text-warning-content mt-6 w-[100px] text-[10px]"
                    @click="remove"
                >
                    Remove Project
                </button>
            </div>
        </ul>
    </div>
</template>
