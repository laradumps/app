<script setup lang="ts">
import { SignalIcon, SignalSlashIcon } from "@heroicons/vue/24/outline";
import { computed, onMounted, ref } from "vue";
import JSConfetti from "js-confetti";

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

onMounted(async () => {
    projects.value = [];

    window.ipcRenderer.send("environment::get");

    window.ipcRenderer.on("app-setting:project-added", () => {
        window.ipcRenderer.send("environment::get");

        const jsConfetti = new JSConfetti();

        jsConfetti.addConfetti();

        newProject.value = true;
        setTimeout(() => (newProject.value = false), 5000);
    });

    window.ipcRenderer.on("app-setting:set-active", (event, value) => {
        if (value.length > 0) {
            selectedProject.value = value;
            setActiveProject();
        }
    });

    window.ipcRenderer.on("app-setting:set-environment", (event, value: Project[]) => {
        projects.value = value;

        if (value.length > 0) {
            selectedProject.value = value[0].path;
            setActiveProject();
        }
    });

    window.ipcRenderer.on("settings:env-file-contents", (event, value) => {
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
    });
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
    window.ipcRenderer.send("main:settings-update-environment", {
        selected: selectedEnvironment.value,
        project: selectedProject.value
    });
};

const removeEnvironment = () => {
    if (selectedProject.value !== "") {
        window.ipcRenderer.on("main:dialog-choice", (event, arg) => {
            if (arg === 0) {
                window.ipcRenderer.send("main:setting-remove-environments", selectedProject.value);

                selectedProject.value = "";
                environments.value = [];

                window.ipcRenderer.emit("environment::get");
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
    window.ipcRenderer.send("main:setting-get-environments", selectedProject.value);
};
</script>

<template>
    <div class="dropdown dropdown-left">
        <div
            tabindex="0"
            role="button"
            class="m-1"
        >
            <SignalSlashIcon
                v-if="selectedProject.length === 0"
                class="w-5 text-error hover:text-primary"
            />

            <SignalIcon
                v-else
                :class="{ 'animate-pulse text-primary': newProject }"
                class="w-5 text-success hover:text-primary"
            />
        </div>
        <ul
            tabindex="0"
            class="dropdown-content z-200 menu p-2 bg-base-100 shadow rounded-box w-52 mt-[35px] !right-0"
        >
            <select
                v-model="selectedProject"
                @change="setActiveProject()"
                class="mb-5 select select-bordered select-xs w-full max-w-xs"
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
                class="text-[10px]"
            >
                No laradumps.yaml found in this project
            </div>

            <div class="max-h-[330px] overflow-auto">
                <li
                    :key="env.value"
                    v-for="env in environments"
                >
                    <label class="label !justify-start !text-left">
                        <input
                            type="checkbox"
                            :name="`env-` + env.id"
                            v-model="env.selected"
                            class="toggle toggle-xs toggle-primary"
                            @change="save"
                        />
                        <span class="text-[9px] tracking-wide font-light uppercase">{{ env.value.replaceAll("_", " ") }}</span>
                    </label>
                </li>
            </div>

            <div class="flex justify-center">
                <button
                    class="btn btn-danger btn-warning mt-2 w-[100px] text-[10px]"
                    @click="removeEnvironment"
                >
                    Remove Project
                </button>
            </div>
        </ul>
    </div>
</template>
