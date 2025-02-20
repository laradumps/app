<script setup lang="ts">
import { SignalIcon, SignalSlashIcon, TrashIcon, PlusIcon } from "@heroicons/vue/24/outline";
import { computed, onMounted, ref, watch } from "vue";
import JSConfetti from "js-confetti";
import { useCurrentProject } from "@/store/current-project";
import { useXDebug } from "@/store/xdebug";
import { XDebugYml } from "@/types/XDebug";
import SelectInput from "@/components/SelectInput.vue";

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

let open = ref<boolean>(false);
let xdebug = ref<boolean>(false);
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

const handleStorageGet = (event, value) => {
    const projectsArray = Object.keys(value).map((key) => ({ project: key, path: value[key] }));

    projects.value = projectsArray;

    if (projectsArray.length > 0) {
        const foundProject = projectsArray.find(p => p.path === currentProjectStore.value);
        if (foundProject) {
            selectedProject.value = foundProject.path;
        }
        window.ipcRenderer.send("storage.get-environments", selectedProject.value);
    }
};

const handleGetEnvironments = (event, value) => {
    if (value != null) {
        environments.value = [];
        value.forEach((entry: Environment) => {
            const env = {
                id: entry.id,
                value: entry.value,
                selected: entry.selected
            }

            environments.value.push(env);

            if (!['dump',
                'enabled_in_testing',
                'original_dump',
                'auto_invoke_app'].includes(env.value) && env.selected) {
                window.dispatchEvent(new CustomEvent('add-screen', { detail: env }))
            }
        });
    }
};

onMounted(async () => {
    window.ipcRenderer.send("storage.get");

    window.ipcRenderer.on("app-setting:project-added", handleProjectAdded);
    window.ipcRenderer.on("storage.set-active.reply", handleSetActiveProject);
    window.ipcRenderer.on("storage.get.reply", handleStorageGet);
    window.ipcRenderer.on("storage.get-environments.reply", handleGetEnvironments);
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

const save = async (env): Promise<void> => {
    window.ipcRenderer.send("storage.update", {
        selected: selectedEnvironment.value,
        project: selectedProject.value
    });

    window.dispatchEvent(new CustomEvent('add-screen', { detail: env }))
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

const connectToXdebug = () => {
    window.ipcRenderer.send("main:setting-get-xdebug-environments", selectedProject.value);
};

const disconnectFromXdebug = () => {
    window.ipcRenderer.send("disconnect-xdebug");
};

window.ipcRenderer.on("xdebug-file-parser-error", (event, args) => {
    console.log("error", args);
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

window.ipcRenderer.on("choose-directory", (event, args) => {
    if (args.hasOwnProperty('error')) {
        my_modal_1.showModal()
    }
});

const addProject = () => {
    window.ipcRenderer.send("main:choose-directory");
};
</script>

<template>
    <div>
        <dialog id="my_modal_1" class="modal">
            <div class="modal-box">
                <h3 class="text-lg font-bold">Install Failure <span class="text-error">⚠️</span></h3>
                <p class="py-4 space-y-2 text-sm">
                    <div>Install laradumps in the project before:</div>
                    <div>
                        <span class="px-2 bg-base-300 p-1 rounded">composer require laradumps/laradumps --dev</span>
                    </div>
                </p>
                <div class="modal-action">
                    <form method="dialog">
                        <button class="btn">Done</button>
                    </form>
                </div>
            </div>
        </dialog>

        <div class="dropdown dropdown-left" :class="{'dropdown-open' : open }">
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
                class="dropdown-content space-y-3 min-w-64 z-[350] menu p-2 bg-base-200 border border-base-content/20 shadow-lg rounded-md w-auto mt-[44px] !-right-10"
            >
                <SelectInput
                    id="projects"
                    v-model="selectedProject"
                    @change="setActiveProject()"
                    placeholder="Select a project"
                    class="w-full"
                >
                    <option
                        v-for="project in projects"
                        :key="project.project"
                        :value="project.path"
                    >
                        {{ project.project }}
                    </option>
                </SelectInput>

                <div class="text-xs flex justify-end gap-4">
                    <PlusIcon class="size-4 text-info cursor-pointer" @click="addProject"/>
                    <TrashIcon class="size-4 text-error cursor-pointer" @click="remove"/>
                </div>

                <div
                    v-if="environments.length === 0"
                    class="text-xs text-base-content text-left p-2"
                >
                    No laradumps.yaml found in this project
                </div>

                <div
                    class="overflow-auto border-t border-base-content/30"
                    :class="{
                    'h-[calc(100vh-11rem)] p-0': environments.length > 0
                }"
                >
                    <li>
                        <label
                            class="label !justify-start !text-left p-1.5"
                            :class="{ 'bg-base-200': false }"
                        >
                            <input
                                type="checkbox"
                                :name="`xdebug`"
                                class="toggle toggle-xs toggle-accent"
                                v-model="xdebug"
                            />
                            <span class="text-[11px] whitespace-nowrap font-semibold uppercase"> xdebug </span>
                        </label>
                    </li>

                    <li
                        :key="env.value"
                        v-for="env in environments"
                    >
                        <label
                            class="text-base-content label !justify-start !text-left p-1.5"
                            :class="{ 'bg-base-200': env.selected }"
                        >
                            <input
                                type="checkbox"
                                :name="`env-` + env.id"
                                v-model="env.selected"
                                class="toggle toggle-xs toggle-accent"
                                @change.stop="save(env)"
                            />
                            <span class="text-[11px] whitespace-nowrap font-semibold uppercase">{{ env.value.replaceAll("_", " ") }}</span>
                        </label>
                    </li>
                </div>
            </ul>
        </div>
    </div>
</template>
