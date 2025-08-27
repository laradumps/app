<script setup lang="ts">
import { PlusIcon } from "@heroicons/vue/24/outline";
import { computed } from "vue";

interface Project {
    path: string;
    project: string;
}

const props = defineProps<{
    starredSortedProjects: Project[];
    regularSortedProjects: Project[];
    selectedProject: Project | null;
}>();

const emit = defineEmits<{
    (e: "addProject"): void;
    (e: "setActiveProject", project: Project): void;
    (e: "onProjectDragStart", list: "starred" | "all", index: number): void;
    (e: "onProjectDrop", list: "starred" | "all", index: number): void;
}>();

const formattedName = (name?: string) => name?.replace(/[-_.]/g, " ") ?? "";

const hasStarred = computed(() => props.starredSortedProjects && props.starredSortedProjects.length > 0);
</script>

<template>
    <div class="overflow-hidden space-y-2">
        <ul class="h-full overflow-x-hidden border-r border-base-200 pr-1.5">
            <li
                @click="emit('addProject')"
                class="w-full flex !flex-nowrap flex-row text-left items-center justify-between mb-4"
            >
                <div class="w-full">
                    <PlusIcon class="size-4 text-primary" />
                    <span>New</span>
                </div>
            </li>

            <template v-if="hasStarred">
                <li class="px-2 py-1 text-[0.65rem] uppercase tracking-wider text-base-content/50 text-left">Starred</li>
                <li
                    v-for="(project, sIdx) in starredSortedProjects"
                    :key="project.path + '-starred'"
                    draggable="true"
                    @dragstart="emit('onProjectDragStart', 'starred', sIdx)"
                    @dragover.prevent
                    @drop="emit('onProjectDrop', 'starred', sIdx)"
                    @click="emit('setActiveProject', project)"
                    class="w-full flex !flex-nowrap flex-row text-left items-center justify-between"
                    :class="{ 'rounded-sm !bg-neutral': selectedProject && selectedProject.path === project.path }"
                >
                    <div class="w-full">
                        <span
                            class="font-normal capitalize text-sm truncate"
                            :class="{ 'text-neutral-content': selectedProject && selectedProject.path === project.path }"
                            v-text="formattedName(project.project)"
                        />
                    </div>
                </li>
                <li class="my-1"><div class="divider m-0"></div></li>
            </template>

            <li class="px-2 py-1 text-[0.65rem] uppercase tracking-wider text-base-content/50 text-left">All Projects</li>
            <li
                v-for="(project, aIdx) in regularSortedProjects"
                :key="project.path + '-regular'"
                draggable="true"
                @dragstart="emit('onProjectDragStart', 'all', aIdx)"
                @dragover.prevent
                @drop="emit('onProjectDrop', 'all', aIdx)"
                @click="emit('setActiveProject', project)"
                class="w-full flex !flex-nowrap flex-row text-left items-center justify-between"
                :class="{ 'rounded-sm !bg-neutral': selectedProject && selectedProject.path === project.path }"
            >
                <div class="w-full">
                    <span
                        class="font-normal capitalize text-sm truncate"
                        :class="{ 'text-neutral-content': selectedProject && selectedProject.path === project.path }"
                        v-text="formattedName(project.project)"
                    />
                </div>
            </li>
        </ul>
    </div>
</template>
