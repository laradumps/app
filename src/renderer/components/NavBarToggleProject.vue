<script setup lang="ts">
import { ArrowsRightLeftIcon } from "@heroicons/vue/24/solid/index.js";
import { onMounted, ref } from "vue";
import { useCurrentProject } from "@/store/current-project";

interface Project {
    path: string;
    project: string;
}

const projects = ref<Project[]>([]);
const selectedProject = ref<string>('');
const currentProjectStore = useCurrentProject();

const handleStorageGet = (event, value) => {
    const projectsArray = Object.keys(value).map((key) => ({ project: key, path: value[key] }));

    projects.value = projectsArray;

    if (projectsArray.length > 0) {
        const foundProject = projectsArray.find((p) => p.path === currentProjectStore.value);
        if (foundProject) {
            selectedProject.value = foundProject.project;
        }
    }
};

onMounted(() => {
    window.ipcRenderer.send("storage.get");
    window.ipcRenderer.on("storage.get.reply", handleStorageGet);
})

</script>

<template>
    <div class="dropdown dropdown-end">
        <div tabindex="0" role="button" class="flex btn max-w-50 !py-0 !px-2 !m-0 btn-soft !h-7 gap-2 opacity-80 uppercase text-[10px]">
            <span class="truncate" v-text="selectedProject"></span>
            <ArrowsRightLeftIcon class="w-4 opacity-90" />
        </div>
        <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-1 w-52 p-2 shadow-sm">
            <li v-for="project in projects.filter((project) => project.project)" :key="project.project" :value="project.path">
                <a class="uppercase">{{ project.project }}</a>
            </li>
        </ul>
    </div>
</template>
