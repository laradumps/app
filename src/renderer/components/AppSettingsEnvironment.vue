<template>
    <form>
        <div>
            <div>
                <div class="space-y-6 sm:space-y-5">
                    <div class="flex items-center p-4 border rounded-lg gap-x-3 dark:border-0 shadow-soft bg-yellow-50 dark:bg-yellow-800">
                        <svg
                            class="w-5 h-5 text-yellow-400 shrink-0"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            ></path>
                        </svg>

                        <p class="text-xs text-yellow-700 dark:text-yellow-400">
                            Run <strong><i>vendor/bin/laradumps configure</i></strong> to add your project here
                        </p>
                    </div>

                    <div class="sm:grid sm:grid-cols-3 sm:items-start sm:gap-4 sm:border-t sm:border-gray-200 sm:pt-3">
                        <label class="text-lg text-left mt-4 font-normal dark:text-slate-300">{{ $t("settings.choose_a_project") }}</label>

                        <div class="flex gap-3 mt-1">
                            <SelectMenu
                                :default-value="1"
                                @selected="changeDefaultProject($event['value'])"
                                class="w-full !text-xs"
                                v-model:data="projects"
                            />
                        </div>
                    </div>

                    <div class="sm:grid sm:grid-cols-3 sm:items-center sm:gap-4 sm:border-t sm:border-gray-200 sm:pt-3">
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
                                                class="h-4 w-4 checkbox"
                                                v-model="env.selected"
                                            />
                                        </div>
                                        <div class="ml-3 text-sm">
                                            <label
                                                :for="`env-` + env.id"
                                                class="font-normal text-gray-700 dark:text-slate-400"
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
                            class="mt-2 border-t border-gray-200 space-y-3 dark:text-slate-400"
                        >
                            <div class="text-lg text-left mt-4 font-normal dark:text-slate-300">
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
                                        class="input !w-full text-sm"
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
                                        class="input !w-full text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="mt-4 mb-8">
                <div class="flex justify-end gap-3">
                    <button
                        v-if="environments.length > 0"
                        @click="removeEnvironment"
                        type="button"
                        class="btn-rounded-negative"
                    >
                        {{ $t("settings.remove") }}
                    </button>

                    <button
                        v-if="environments.length > 0"
                        @click="saveEnvironment"
                        type="button"
                        class="btn-rounded-sky"
                    >
                        {{ $t("settings.save") }}
                    </button>
                </div>
            </div>

            <div class="flex justify-end">
                <button
                    @click="clearAllEnvironments"
                    type="button"
                    class="btn-rounded-negative"
                >
                    {{ $t("settings.clear_all_environments") }}
                </button>
            </div>
        </div>
    </form>
</template>

<script setup lang="ts">
import SelectMenu from "@/components/SelectMenu.vue";
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

const i18n = useI18n();

const hasErrors = ref(false);
const environments = ref([]);
const projectName = ref("");
const envFile = ref("");
const selectedProject = ref();

const ideList = ref([]);

const selectedIdeHandler = ref("");
const projectPath = ref("");

const projects = ref([
    {
        id: 0,
        label: i18n.t("settings.choose_a_project"),
        value: ""
    }
]);

const chooseIde = (value) => {
    selectedIdeHandler.value = value;
};

onMounted(async () => {
    window.ipcRenderer.send("main:get-environment");

    window.ipcRenderer.on("app-setting:env-file", (event, value) => {
        envFile.value = value;
    });

    window.ipcRenderer.send("main:get-ide-handler");

    window.ipcRenderer.on("app:ide-handler", (event, value) => {
        ideList.value = value;
    });

    window.ipcRenderer.on("app-setting:removed", () => {
        alert("Removed");

        selectedProject.value = "";
        environments.value = [];
    });

    window.ipcRenderer.on("app-setting:set-environment", (event, value) => {
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
        window.ipcRenderer.send("main:setting-remove-environments", selectedProject.value);
    }
};

const changeDefaultProject = (value) => {
    selectedProject.value = value;
    environments.value = [];

    window.ipcRenderer.send("main:setting-get-environments", value);
};

const cancel = (): void => {
    projectName.value = "";
    envFile.value = "";
    hasErrors.value = false;
};

const clearAllEnvironments = (): void => {
    window.ipcRenderer.send("main:settings-clear-all-environment");
};

const saveEnvironment = async (): Promise<void> => {
    await window.ipcRenderer.send("main:settings-update-environment", {
        selected: selectedEnvironment.value,
        file: selectedProject.value,
        selectedIdeHandler: selectedIdeHandler.value,
        projectPath: projectPath.value,
        create: false
    });

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
