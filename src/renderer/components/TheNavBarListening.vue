<script setup lang="ts">
import { SignalIcon } from "@heroicons/vue/24/outline";
import { computed, onMounted, ref, watch } from "vue";

const selectedProject = ref();
const projects = ref([]);
const environments = ref([]);

onMounted(async () => {
    projects.value = [];

    const loadEnvironment = async () => {
        await window.ipcRenderer.send("main:get-environment");

        window.ipcRenderer.on("app-setting:set-environment", (event: Event, value: any) => {
            if (value != null) {
                const uniqueProjects = new Map();
                value.forEach((environment) => {
                    if (!uniqueProjects.has(environment.projectName)) {
                        uniqueProjects.set(environment.projectName, environment);
                    }
                });

                const uniqueProjectsArray = Array.from(uniqueProjects.values()).map((environment) => ({
                    id: environment.projectName,
                    label: environment.projectName + " - " + environment.envFile,
                    value: environment.envFile
                }));

                projects.value = uniqueProjectsArray;
            }
        });
    };

    await loadEnvironment();

    window.ipcRenderer.send("main:get-ide-handler");

    window.ipcRenderer.on("app-setting:env-update-environment-success", () => {
        console.log("Updated !");
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

const selectedEnvironment = computed(() => {
    return environments.value.map((key) => {
        return {
            value: key.value,
            selected: key.selected
        };
    });
});

const save = async (): Promise<void> => {
    await window.ipcRenderer.send("main:settings-update-environment", {
        selected: selectedEnvironment.value,
        file: selectedProject.value,
        create: false
    });
};

const changeDefaultProject = () => {
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
            <SignalIcon class="w-5 hover:text-primary" />
        </div>
        <ul
            tabindex="0"
            class="dropdown-content z-100 menu p-2 bg-base-100 shadow rounded-box w-52 mt-[35px] !right-0"
        >
            <select
                v-model="selectedProject"
                @change="changeDefaultProject()"
                class="mb-5 select select-bordered select-xs w-full max-w-xs"
            >
                <option
                    disabled
                    selected
                >
                    Select Project
                </option>

                <option
                    v-for="project in projects"
                    :ref="project.id"
                >
                    {{ project.value }}
                </option>
            </select>

            <div v-if="environments.length === 0">Select a Project</div>

            <div class="max-h-[300px] overflow-auto">
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
                        <span class="text-[0.7rem] tracking-wide font-semibold">{{ env.name }}</span>
                    </label>
                </li>
            </div>
        </ul>
    </div>
</template>

<style scoped></style>
