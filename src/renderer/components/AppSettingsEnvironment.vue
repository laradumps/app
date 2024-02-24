<template>
    <form>
        <div
            class="flex gap-4 items-center opacity-70 text-xs"
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                class="stroke-current shrink-0 w-4 h-4"
            >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
            </svg>
            <span v-html="i18n.t('settings.run_to_add_your_project_here').replace('vendor/bin/laradumps configure', '<b>vendor/bin/laradumps configure</b>')"></span>
        </div>

        <div>
            <ul
                role="list"
                class="mt-2"
            >
                <li
                    class="relative py-2"
                    v-for="project in projects"
                    :ref="project.id"
                >
                    <div @click="changeDefaultProject(project.value)">
                        <div
                            :class="{ 'bg-base-200 dark:bg-base-700': selectedProject == project.value }"
                            class="mx-auto bg-neutral border border-base-200 dark:border-base-700 flex max-w-4xl group justify-between gap-x-6 cursor-pointer hover:border-base-300 dark:hover:bg-base-700 rounded-md p-2"
                        >
                            <div class="flex gap-x-4">
                                <div class="min-w-0 flex-auto">
                                    <p class="text-sm font-semibold leading-6 text-base-900 dark:text-base-300">
                                        {{ project.id }}
                                    </p>
                                    <p
                                        :class="{ 'text-base-800': selectedProject == project.value }"
                                        class="mt-1 flex text-xs leading-5 text-base-500 dark:text-base-400 group-hover:text-base-800 dark:group-hover:text-base-400"
                                    >
                                        {{ project.value }}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div v-if="selectedProject === project.value">
                        <div>
                            <div class="p-2">
                                <div>
                                    <div class="mt-1 sm:col-span-2 sm:mt-0">
                                        <div class="items-center">
                                            <div
                                                :key="env.id"
                                                v-for="env in environments"
                                            >
                                                <div class="relative flex items-center py-0.5">
                                                    <div class="flex h-5 items-center">
                                                        <input
                                                            :name="`env-` + env.id"
                                                            type="checkbox"
                                                            class="checkbox checkbox-sm checkbox-secondary"
                                                            v-model="env.selected"
                                                        />
                                                    </div>
                                                    <div class="ml-3 text-sm">
                                                        <label
                                                            :for="`env-` + env.id"
                                                            class="font-light text-base-content"
                                                        >
                                                            {{ env.name }}
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div
                                        v-show="environments.length > 0"
                                        class="mt-2 border-t border-base-200 space-y-3 dark:text-base-400 dark:border-base-700"
                                    >
                                        <div class="text-lg text-left mt-4 font-normal dark:text-base-300">
                                            {{ $t("installer.choose_your_preferred_ide") }}
                                        </div>

                                        <div class="w-full gap-2 text-left text-sm space-y-3">
                                            <span class="text-xs">
                                                {{ $t("installer.preferred_ide_info") }}
                                            </span>

                                            <div>
                                                <div>{{ $t("installer.select_an_editor_from_the_template") }} :</div>

                                                <SelectMenu
                                                    @selected="chooseIde($event?.defaultEnvironment)"
                                                    class="w-full !text-xs text-left"
                                                    v-model:data="ideList"
                                                />
                                            </div>
                                            <div>
                                                <div>{{ $t("installer.or_customize_your_ide_handler") }}:</div>
                                                <input
                                                    type="text"
                                                    v-model="selectedIdeHandler"
                                                    class="input input-bordered input-sm !w-full text-sm"
                                                />
                                            </div>
                                            <div class="space-y-1">
                                                <div>{{ $t("installer.php_project_path") }}: (when docker)</div>

                                                <span class="text-xs mt-2">
                                                    {{ $t("installer.php_project_path_info") }}
                                                </span>

                                                <input
                                                    type="text"
                                                    v-model="projectPath"
                                                    placeholder="/Users/luan.freitas/my-project"
                                                    class="input input-bordered input-sm !w-full text-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="mt-4 pb-4 border-b border-base-200 dark:border-base-800">
                            <div class="flex justify-end gap-3">
                                <button
                                    v-if="environments.length > 0"
                                    @click="removeEnvironment"
                                    type="button"
                                    class="btn btn-danger"
                                >
                                    {{ $t("settings.remove") }}
                                </button>

                                <button
                                    v-if="environments.length > 0"
                                    @click="saveEnvironment"
                                    type="button"
                                    class="btn btn-primary"
                                >
                                    {{ $t("settings.save") }}
                                </button>
                            </div>
                        </div>
                    </div>
                </li>
            </ul>
        </div>
    </form>
</template>

<script setup lang="ts">
import SelectMenu from "@/components/SelectMenu.vue";
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useSettingStore } from "@/store/setting";

const i18n = useI18n();
const settingStore = useSettingStore();

const hasErrors = ref(false);
const environments = ref([]);
const projectName = ref("");
const envFile = ref("");
const selectedProject = ref();

const ideList = ref([]);

const selectedIdeHandler = ref("");
const projectPath = ref("");

const projects = ref([]);

const chooseIde = (value: string) => {
    selectedIdeHandler.value = value;
};

onMounted(async () => {
    const loadEnvironment = async () => {
        window.ipcRenderer.send("main:get-environment");

        await window.ipcRenderer.on("app-setting:set-environment", (event, value) => {
            if (value != null) {
                value.forEach((environment) => {
                    projects.value.push({
                        id: environment.projectName,
                        label: environment.projectName + " - " + environment.envFile,
                        value: environment.envFile
                    });
                });
            }
        });
    };

    await loadEnvironment();

    window.ipcRenderer.on("app-setting:env-file", (event, value) => {
        envFile.value = value;
    });

    window.ipcRenderer.send("main:get-ide-handler");

    window.ipcRenderer.on("app:ide-handler", (event, value) => {
        ideList.value = value;
    });

    window.ipcRenderer.on("settings:env-file-contents", (event, value) => {
        if (value != null) {
            environments.value = [];
            value
                .filter((environment) => environment.value !== "DS_INSTALLED")
                .forEach((entry) => {
                    environments.value.push({
                        id: entry.id,
                        value: entry.value,
                        name: entry.name,
                        selected: entry.selected
                    });
                });
        }
    });
});

const removeEnvironment = () => {
    if (selectedProject.value !== "") {
        window.ipcRenderer.on("main:dialog-choice", (event, arg) => {
            if (arg === 0) {
                window.ipcRenderer.send("main:setting-remove-environments", selectedProject.value);

                selectedProject.value = "";
                environments.value = [];

                alert("The project was removed successfully!");
            }
        });

        window.ipcRenderer.send("main:dialog", {
            buttons: ["Yes", "No"],
            title: "Remove Project",
            message: "Are you sure you want to remove the configuration from this Project?"
        });
    }
};

const changeDefaultProject = (value) => {
    if (value === selectedProject.value) {
        selectedProject.value = "";
        environments.value = [];

        return;
    }

    selectedProject.value = value;
    environments.value = [];

    window.ipcRenderer.send("main:setting-get-environments", value);
};

const cancel = (): void => {
    projectName.value = "";
    envFile.value = "";
    hasErrors.value = false;
};

const saveEnvironment = async (): Promise<void> => {
    await window.ipcRenderer.send("main:settings-update-environment", {
        selected: selectedEnvironment.value,
        file: selectedProject.value,
        selectedIdeHandler: selectedIdeHandler.value,
        projectPath: projectPath.value,
        create: false
    });

    selectedProject.value = "";
    environments.value = [];

    alert("Updated successfully!");
};

const selectedEnvironment = computed(() => {
    return environments.value.map((key) => {
        return {
            value: key.value,
            selected: key.selected
        };
    });
});
</script>
