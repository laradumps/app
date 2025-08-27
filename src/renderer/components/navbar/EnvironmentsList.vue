<script setup lang="ts">
import type { Environment } from "../../main/storage";

const props = defineProps<{
    environments: Environment[];
    activeEnvKey: string | null;
    isXdebugActive: boolean;
}>();

const emit = defineEmits<{
    (e: "onEnvChange", env: Environment): void;
    (e: "onEnvDragStart", index: number): void;
    (e: "onEnvDrop", index: number): void;
    (e: "saveEnvironment", env: Environment | null): void;
    (e: "toggleXdebug"): void;
}>();

const onEnvDragOver = (e: DragEvent) => e.preventDefault();
const formattedName = (s: string) => s?.replace(/[-_.]/g, " ") ?? "";
</script>

<template>
    <div class="text-sm overflow-auto pr-2 w-1/2">
        <ul>
            <li>
                <label class="space-x-1">
                    <input
                        type="checkbox"
                        class="checkbox checkbox-xs"
                        :class="{ 'checkbox-primary': props.isXdebugActive }"
                        :checked="props.isXdebugActive"
                        @change.stop="emit('toggleXdebug')"
                    />
                    <span class="text-base-content">Xdebug</span>
                </label>
            </li>

            <li
                v-for="(env, idx) in props.environments"
                :key="env.id"
                draggable="true"
                @dragstart="emit('onEnvDragStart', idx)"
                @dragover="onEnvDragOver"
                @drop="emit('onEnvDrop', idx)"
            >
                <label
                    :title="formattedName(env.value)"
                    :class="{ '!bg-neutral text-neutral-content rounded-md': props.activeEnvKey === env.value && env.selected }"
                    class="capitalize space-x-1 cursor-pointer"
                >
                    <input
                        v-model="env.selected"
                        type="checkbox"
                        class="checkbox checkbox-xs"
                        :class="{ 'checkbox-accent': env.selected }"
                        @change.stop="emit('onEnvChange', env)"
                    />
                    <span
                        :class="{ 'text-neutral-content': props.activeEnvKey === env.value && env.selected }"
                        class="text-base-content truncate font-normal"
                        >{{ formattedName(env.value) }}</span
                    >
                </label>
            </li>
        </ul>
    </div>
</template>
