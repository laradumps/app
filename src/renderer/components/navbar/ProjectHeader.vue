<script setup lang="ts">
import { StarIcon as StarSolid } from "@heroicons/vue/24/solid";
import { StarIcon as StarOutline, TrashIcon } from "@heroicons/vue/24/outline";

interface Project {
    path: string;
    project: string;
}

const props = defineProps<{
    project: Project | null;
    isStarred: (name: string) => boolean;
}>();

const emit = defineEmits<{
    (e: "toggleStar", name: string): void;
    (e: "confirmProjectRemoval", path: string): void;
}>();

const formattedName = (name?: string) => name?.replace(/[-_.]/g, " ") ?? "";
</script>

<template>
    <div class="text-left pl-3 w-full">
        <div class="flex items-start justify-between gap-1 w-full">
            <div class="w-full truncate text-base-content/60">
                <span class="text-[11px] !text-base-content/60">{{ project?.path }}</span>
            </div>

            <button
                class="btn btn-ghost btn-xs btn-circle"
                :title="props.project && isStarred(props.project.project) ? 'Unstar' : 'Star'"
                @click.stop="props.project && emit('toggleStar', props.project.project)"
            >
                <StarSolid
                    v-if="props.project && isStarred(props.project.project)"
                    class="size-4 text-warning"
                />
                <StarOutline
                    v-else
                    class="size-4"
                />
            </button>

            <button
                v-if="project?.path"
                class="btn btn-ghost btn-xs btn-circle text-error"
                :title="`Remove ${formattedName(project?.project)}`"
                @click.stop="emit('confirmProjectRemoval', project!.path)"
            >
                <TrashIcon class="size-4" />
            </button>
        </div>
    </div>
</template>
