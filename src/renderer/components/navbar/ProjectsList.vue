<script setup lang="ts">
import { PlusIcon } from '@heroicons/vue/24/outline';
import { computed } from 'vue';

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
    (e: 'addProject'): void;
    (e: 'setActiveProject', project: Project): void;
    (e: 'onProjectDragStart', list: 'starred' | 'all', index: number): void;
    (e: 'onProjectDrop', list: 'starred' | 'all', index: number): void;
}>();

const formattedName = (name?: string) => name?.replace(/[-_.]/g, ' ') ?? '';

const hasStarred = computed(() => props.starredSortedProjects && props.starredSortedProjects.length > 0);
</script>

<template>
    <div class="space-y-4 px-3 w-full pb-4">
        <!-- New Project Button -->
        <button
            @click="emit('addProject')"
            class="w-full btn btn-primary btn-sm flex items-center justify-center gap-2 rounded-lg font-medium shadow-sm hover:shadow"
        >
            <PlusIcon class="size-4" />
            <span>New</span>
        </button>

        <div class="space-y-6">
            <template v-if="hasStarred">
                <div class="space-y-1 mt-6">
                    <div
                        class="px-2 text-[0.65rem] font-semibold uppercase tracking-wider text-base-content/40 mb-2 flex items-center gap-2"
                    >
                        <span>Starred</span>
                    </div>
                    <ul class="space-y-0.5">
                        <li
                            v-for="(project, sIdx) in starredSortedProjects"
                            :key="project.path + '-starred'"
                            draggable="true"
                            @dragstart="emit('onProjectDragStart', 'starred', sIdx)"
                            @dragover.prevent
                            @drop="emit('onProjectDrop', 'starred', sIdx)"
                            @click="emit('setActiveProject', project)"
                            class="w-full flex items-center justify-between px-3 py-1.5 rounded-lg cursor-pointer transition-colors duration-150 relative"
                            :class="[
                                selectedProject && selectedProject.path === project.path
                                    ? 'bg-base-content/10 text-base-content font-medium'
                                    : 'text-base-content/70 hover:bg-base-content/5 hover:text-base-content'
                            ]"
                        >
                            <span
                                class="capitalize text-sm truncate"
                                v-text="formattedName(project.project)"
                            />
                        </li>
                    </ul>
                </div>
            </template>

            <div class="space-y-1">
                <div
                    class="px-2 text-[0.65rem] font-semibold uppercase tracking-wider text-base-content/40 mb-2 flex items-center gap-2"
                >
                    <span>All Projects</span>
                </div>
                <ul class="space-y-0.5">
                    <li
                        v-for="(project, aIdx) in regularSortedProjects"
                        :key="project.path + '-regular'"
                        draggable="true"
                        @dragstart="emit('onProjectDragStart', 'all', aIdx)"
                        @dragover.prevent
                        @drop="emit('onProjectDrop', 'all', aIdx)"
                        @click="emit('setActiveProject', project)"
                        class="w-full flex items-center justify-between px-3 py-1.5 rounded-lg cursor-pointer transition-colors duration-150 relative"
                        :class="[
                            selectedProject && selectedProject.path === project.path
                                ? 'bg-base-content/10 text-base-content font-medium'
                                : 'text-base-content/70 hover:bg-base-content/5 hover:text-base-content'
                        ]"
                    >
                        <span
                            class="capitalize text-sm truncate"
                            v-text="formattedName(project.project)"
                        />
                    </li>
                </ul>
            </div>
        </div>
    </div>
</template>
