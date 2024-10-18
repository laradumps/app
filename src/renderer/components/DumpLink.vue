<script setup lang="ts">
import { computed, defineProps, onMounted, ref, watch } from "vue";
import { useIDEHandlerStore } from "@/store/ide-handler";
import { IdeHandle } from "@/types/IdeHandle";

const props = defineProps<{
    ideHandler?: IdeHandle;
    label?: string;
}>();

const IDEHandler = useIDEHandlerStore();

const link = ref();

onMounted(() => {
    generateLink(IDEHandler.value);
});

watch(IDEHandler, (value) => {
    const ide = value.value;

    generateLink(ide);
});

const generateLink = (ide: string) => {
    const projectPath = props.ideHandler.project_path;
    const realPath = props.ideHandler.real_path;
    const workdir = props.ideHandler.workdir;
    const wsl_config = props.ideHandler.wsl_config;

    const relativePath = realPath?.replace(workdir, "").replace(projectPath, "");

    const linkPath = projectPath + relativePath;

    console.log(realPath)
    if (realPath != null) {
        if (IDEHandler.value.includes("wsl_config")) {
            if (wsl_config != undefined) {
                link.value = ide
                    .replace("{wsl_config}", wsl_config)
                    .replace("{filepath}", linkPath)
                    .replace("{line}", props.ideHandler.line);

                console.log(link.value)
                return;
            }

            link.value = ide.replace("{filepath}", linkPath).replace("{line}", props.ideHandler.line);

            return;
        }

        link.value = ide.replace("{filepath}", linkPath).replace("{line}", props.ideHandler.line);
    }
};

const label = computed(() => {
    if (props.label) {
        return props.label;
    }

    if (props.ideHandler.line?.toString() !== "") {
        return props.ideHandler.class_name + ":" + props.ideHandler.line;
    }

    if (props.ideHandler.real_path == null) {
        return "Tinker";
    }

    return "";
});
</script>

<template>
    <a
        :href="link"
        :title="label"
        :class="{ 'cursor-pointer min-w-[45px]': link }"
        class="flex items-center group cursor-pointer"
    >
        <span class="break-all tracking-wider hover:opacity-75 flex items-center">
            <span
                class="whitespace-nowrap"
                :class="{ '!text-gray-400': props.label }"
                >{{ label }}</span
            >
            <div
                v-if="label"
                class="z-30 p-1 text-gray-300 bg-gray-800 border border-gray-600 shadow-lg rounded-full opacity-0 group-hover/line:opacity-100 sticky ml-1"
            >
                <svg
                    class="size-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="currentColor"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"
                    />
                </svg>
            </div>
        </span>
    </a>
</template>
