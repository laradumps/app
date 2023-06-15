<template>
    <div class="px-5 text-sm space-y-4 items-center justify-center">
        <div class="text-lg mb-4 text-left font-normal">
            {{ $t("installer.laradumps_settings") }}
        </div>

        <div class="text-xs mb-4 text-left font-normal">Environment File: {{ envPath }}</div>

        <div class="w-full gap-2 text-left space-y-3">
            <div class="space-y-1">
                <div>{{ $t("installer.php_project_name") }}:</div>
                <input
                    type="text"
                    ref="projectName"
                    class="input !w-full text-sm"
                    :value="name"
                />
            </div>
        </div>

        <div class="w-full gap-2 text-left space-y-3">
            <div class="space-y-1">
                <div>{{ $t("installer.php_project_path") }}: (when docker)</div>

                <span class="text-xs mt-2">
                    {{ $t("installer.php_project_path_info") }}
                </span>

                <input
                    type="text"
                    v-model="projectPath"
                    placeholder="/Users/{user.name}/Sites/my-project"
                    class="input !w-full text-sm"
                />
            </div>
        </div>

        <div class="text-lg text-left font-normal">
            {{ $t("installer.choose_your_preferred_ide") }}
        </div>

        <div class="w-full gap-2 text-left space-y-3">
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
        </div>

        <div class="text-lg text-left font-normal">
            {{ $t("installer.configure_lara_dumps") }}
        </div>
        <div class="mt-4">
            <label
                :key="env.id"
                :for="`env-` + env.id"
                v-for="env in environments"
            >
                <div class="relative flex items-center py-0.5">
                    <div class="flex h-5 items-center">
                        <input
                            :name="`env-` + env.id"
                            :id="`env-` + env.id"
                            type="checkbox"
                            class="h-4 w-4 checkbox"
                            v-model="env.selected"
                        />
                    </div>
                    <div
                        class="ml-3 text-sm"
                        v-text="env.name"
                    />
                </div>
            </label>
        </div>

        <div class="flex justify-end gap-2">
            <button
                class="btn-rounded-negative text-sm font-semibold"
                @click="cancel"
            >
                {{ $t("installer.cancel") }}
            </button>

            <button
                class="btn-rounded-sky text-sm font-semibold"
                @click="save"
            >
                {{ $t("installer.save") }}
            </button>
        </div>
    </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import SelectMenu from "@/components/SelectMenu.vue";

const props = defineProps({
    environmentList: {
        type: Array
    },
    envPath: {
        type: String
    },
    name: {
        type: String
    }
});

const ideList = ref([]);
const selectedIdeHandler = ref("");
const projectName = ref(null);
const projectPath = ref("");

const emit = defineEmits("close");

onMounted(async () => {
    window.ipcRenderer.send("main:get-ide-handler");

    window.ipcRenderer.on("app:ide-handler", (event, value) => {
        ideList.value = value;
    });

    if (props.name) {
        projectName.value = props.name;
    }

    window.ipcRenderer.send("main:get-environment");

    window.ipcRenderer.on("main:search-environment-by-path", () => {
        alert("This project already exists");
    });

    window.ipcRenderer.on("installer:close-modal", () => {
        setTimeout(() => emit("close"), 300);
    });
});

const cancel = () => {
    setTimeout(() => emit("close"), 300);
};

const chooseIde = (value) => {
    selectedIdeHandler.value = value;
};

const selectedNames = computed(() => {
    return environments.value.map((key) => {
        return {
            value: key.id,
            text: null,
            selected: key.selected
        };
    });
});

const normalizeEnvPath = () => {
    const path = require("path");
    const fs = require("fs");

    let envPath = props.envPath;

    if (!fs.existsSync(envPath) && projectPath.value === "") {
        return null;
    }

    if (projectPath.value !== "") {
        envPath = path.join(path.normalize(projectPath.value) + path.sep, ".env", "");

        if (!fs.existsSync(envPath)) {
            projectPath.value.focus();

            return null;
        }
    }

    return envPath;
};

const save = async () => {
    if (projectName.value.value.trim().toString() === "") {
        projectName.value.focus();

        return;
    }

    const envPath = normalizeEnvPath();

    const selected = selectedNames.value.concat(
        {
            value: "DS_FILE_HANDLER",
            text: selectedIdeHandler.value,
            selected: null
        },
        {
            value: "DS_PROJECT_PATH",
            text: projectPath.value,
            selected: null
        },
        {
            value: "DS_INSTALLED",
            selected: true
        }
    );

    const updateEnv = async () => {
        await window.ipcRenderer.send("main:settings-update-environment", {
            selected: selected,
            file: normalizeEnvPath(),
            create: true
        });
    };

    updateEnv().then(async () => {
        await window.ipcRenderer.send("main:store-config", {
            projectName: projectName.value.value.toString(),
            projectRoot: projectPath.value.toString(),
            envFile: envPath
        });
    });
};

const environments = computed(() => {
    let list = [];
    props.environmentList.forEach((env) => {
        list.push({
            id: env,
            name: env.replaceAll("DS_", "").replaceAll("_", " ").replaceAll("SEND", ""),
            selected: false
        });
    });

    return list;
});
</script>
