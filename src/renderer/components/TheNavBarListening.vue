<script setup lang="ts">
import { SignalIcon, SignalSlashIcon } from "@heroicons/vue/24/outline";
import { computed, onMounted, ref, watch } from "vue";
import JSConfetti from "js-confetti";
import { useXDebug } from "@/store/xdebug";
import { XDebugYml } from "@/types/XDebug";
import IconPlus from "@/components/Icons/IconPlus.vue";
import IconTrash from "@/components/Icons/IconTrash.vue";

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

let xdebug = ref<boolean>(false);
const selectedProject = ref<string>("");
const newProject = ref<boolean>(false);
const projects = ref<Project[]>([]);
const environments = ref<Environment[]>([]);

onMounted(async () => {
    projects.value = [];

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

    window.ipcRenderer.on("app-setting:set-environment", (event, value: object) => {
        const projectsArray = Object.keys(value).map((key) => ({ project: key, path: value[key] }));

        projects.value = projectsArray;

        if (projectsArray.length > 0) {
            selectedProject.value = projectsArray[0].path;
            setActiveProject();
        }
    });

    window.ipcRenderer.on("settings:env-file-contents", (event, contents: { environmentYmlList: null | object; projectName: string }) => {
        console.log(contents.environmentYmlList);
        if (contents.environmentYmlList.length > 0) {
            environments.value = [];

            contents.environmentYmlList.forEach((entry: Environment) => {
                environments.value.push({
                    id: entry.id,
                    value: entry.value,
                    selected: entry.selected
                });
            });

            window.ipcRenderer.send("main:tray-update-context-menu", {
                environmentYmlList: JSON.parse(JSON.stringify(environments.value)),
                projectName: contents.projectName
            });
        }
    });

    window.ipcRenderer.on("main:tray-updated-environment-options", (event, value) => {
        window.ipcRenderer.send("main:settings-update-environment", {
            selected: value,
            project: selectedProject.value
        });
    });

    window.ipcRenderer.on("xdebug-error", handleError);

    window.ipcRenderer.on("xdebug-connector::disconnect", () => {
        disconnectFromXdebug();
    });

    window.ipcRenderer.on("xdebug-connect-closed", (event, args) => {
        setTimeout(() => {
            xdebug.value = false;
        }, 800);
    });
});

const handleError = (event, err) => {
    console.error(err);
};

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

    window.ipcRenderer.send("main:tray-update-context-menu", {
        environmentYmlList: JSON.parse(JSON.stringify(environments.value))
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

const connectToXdebug = () => {
    console.log(selectedProject.value);
    window.ipcRenderer.send("main:setting-get-xdebug-environments", selectedProject.value);
};

const disconnectFromXdebug = () => {
    window.ipcRenderer.send("disconnect-xdebug");
};

window.ipcRenderer.on("xdebug-file-parser-error", (event, args) => {
    console.log("error", args);
});

const addProject = () => {
    window.ipcRenderer.send("main:choose-directory");
};

window.ipcRenderer.on("choose-directory", (event, args) => {
    console.log(args);
});

watch(xdebug, (value) => {
    if (value) {
        connectToXdebug();
        return;
    }

    disconnectFromXdebug();
});

window.ipcRenderer.on("settings:env-xdebug-file-contents", (event, arg: XDebugYml) => {
    xDebugStore.setCurrent(arg);
    window.ipcRenderer.send("connect-xdebug", arg);
});
</script>

<template>
    <div>
        <div class="flex gap-3">
            <div class="dropdown dropdown-left z-[400]">
                <div
                    tabindex="0"
                    role="button"
                    :class="{
                        '!text-primary bg-base-200': selectedProject
                    }"
                    class="px-1.5 py-2 hover:bg-base-200 text-base-content cursor-pointer rounded-md"
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
                    :class="{ 'h-[calc(100vh-3.5rem)]': selectedProject && !xdebug }"
                    class="dropdown-content min-w-[220px] space-y-3 gap-4 overflow-y-auto z-200 menu p-4 bg-neutral block border border-neutral-content/20 shadow-lg rounded-box mt-[35px] !right-0"
                >
                    <button
                        class="btn btn-info w-full text-[10px]"
                        @click="addProject"
                    >
                        <IconPlus class="w-5" />

                        Add New Project
                    </button>

                    <select
                        v-model="selectedProject"
                        @change="setActiveProject()"
                        class="select select-bordered select-xs bg-neutral text-neutral-content w-full h-[1.85rem] font-semibold max-w-xs"
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
                        class="text-xs text-neutral-content"
                    >
                        No laradumps.yaml found in this project
                    </div>

                    <div
                        class="overflow-auto"
                        v-if="selectedProject"
                    >
                        <li>
                            <label
                                class="bg-neutral text-neutral-content label !justify-start !text-left p-1.5"
                                :class="{ 'bg-base-200': false }"
                            >
                                <input
                                    type="checkbox"
                                    :name="`xdebug`"
                                    class="toggle toggle-xs toggle-accent"
                                    v-model="xdebug"
                                />
                                <span class="text-[10px] whitespace-nowrap font-semibold uppercase"> xdebug </span>
                            </label>
                        </li>

                        <li
                            :key="env.value"
                            v-for="env in environments"
                        >
                            <label
                                class="bg-neutral text-neutral-content label !justify-start !text-left p-1.5"
                                :class="{ 'bg-base-200': env.selected }"
                            >
                                <input
                                    type="checkbox"
                                    :name="`env-` + env.id"
                                    v-model="env.selected"
                                    class="toggle toggle-xs toggle-accent"
                                    @change="save"
                                    :disabled="xdebug"
                                />
                                <span class="text-[10px] whitespace-nowrap font-semibold uppercase">{{ env.value.replaceAll("_", " ") }}</span>
                            </label>
                        </li>
                    </div>

                    <button
                        v-if="selectedProject"
                        class="btn mt-2 btn-error text-warning-content w-full text-[10px]"
                        @click="removeEnvironment"
                    >
                        <IconTrash class="w-5" />
                        Remove Project
                    </button>
                </ul>
            </div>
        </div>
    </div>
</template>
