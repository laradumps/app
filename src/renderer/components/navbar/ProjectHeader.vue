<script setup lang="ts">
import { StarIcon as StarSolid } from '@heroicons/vue/24/solid';
import { StarIcon as StarOutline, TrashIcon } from '@heroicons/vue/24/outline';

interface Project {
    path: string;
    project: string;
}

const props = defineProps<{
    project: Project | null;
    isStarred: (name: string) => boolean;
}>();

const emit = defineEmits<{
    (e: 'toggleStar', name: string): void;
    (e: 'confirmProjectRemoval', path: string): void;
}>();

const formattedName = (name?: string) => name?.replace(/[-_.]/g, ' ') ?? '';
</script>

<template>
    <div class="w-full flex items-start justify-between">
        <div class="flex text-left flex-col max-w-full overflow-hidden w-full">
            <div class="flex items-center gap-3">
                <h1 class="text-2xl font-bold text-base-content truncate">
                    {{ formattedName(project?.project || 'Unknown Project') }}
                </h1>
                <div class="flex items-center gap-1 shrink-0">
                    <button
                        class="btn btn-ghost btn-xs btn-circle hover:bg-warning/10"
                        :title="props.project && isStarred(props.project.project) ? 'Unstar' : 'Star'"
                        @click.stop="props.project && emit('toggleStar', props.project.project)"
                    >
                        <StarSolid
                            v-if="props.project && isStarred(props.project.project)"
                            class="size-4 text-warning"
                        />
                        <StarOutline
                            v-else
                            class="size-4 text-base-content/40 hover:text-warning transition-colors"
                        />
                    </button>
                    <button
                        v-if="project?.path"
                        class="btn btn-ghost btn-xs btn-circle hover:bg-error/10 text-base-content/40 hover:text-error transition-colors"
                        :title="`Remove ${formattedName(project?.project)}`"
                        @click.stop="emit('confirmProjectRemoval', project!.path)"
                    >
                        <TrashIcon class="size-4" />
                    </button>
                </div>
            </div>
            <p
                class="text-[0.7rem] font-mono text-base-content/50 truncate mt-1 pr-6"
                :title="project?.path"
            >
                {{ project?.path || '' }}
            </p>
        </div>
    </div>
</template>
