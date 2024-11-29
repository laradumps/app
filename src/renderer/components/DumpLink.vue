<script setup lang="ts">
import { computed, defineProps, onMounted, ref, watch } from "vue";
import { useIDEHandlerStore } from "@/store/ide-handler";
import { IdeHandle } from "@/types/IdeHandle";
import IconPencil from "@/components/Icons/IconPencil.vue";

const props = defineProps<{
    ideHandler?: IdeHandle;
    label?: string;
    showIcon: boolean;
}>();

const IDEHandler = useIDEHandlerStore();

const link = ref();

onMounted(() => {
    generateLink(IDEHandler.value);
});

watch(IDEHandler.value, (value) => {
    const ide = value;

    generateLink(ide);
});

const generateLink = (ide: string) => {
    const projectPath = props.ideHandler.project_path;
    const realPath = props.ideHandler.real_path;
    const workdir = props.ideHandler.workdir;
    const wsl_config = props.ideHandler.wsl_config;

    const relativePath = realPath?.replace(workdir, "").replace(projectPath, "");

    const linkPath = projectPath + relativePath;

    console.log(realPath);
    if (realPath != null) {
        if (IDEHandler.value.includes("wsl_config")) {
            if (wsl_config != undefined) {
                link.value = ide.replace("{wsl_config}", wsl_config).replace("{filepath}", linkPath).replace("{line}", props.ideHandler.line);

                console.log(link.value);
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
    <div>
        <a
            v-if="!showIcon"
            :href="link"
            :title="label"
            :class="{ 'cursor-pointer': link }"
            class="flex items-center group cursor-pointer"
        >
            <span class="break-all tracking-wider hover:opacity-75 flex items-center">
                <span
                    class="whitespace-nowrap"
                    :class="{ '!text-gray-400': props.label }"
                    >{{ label }}</span
                >
            </span>
        </a>

        <div
            v-else
            :title="label"
            class="flex items-center group"
        >
            <div class="break-all h-[32px] tracking-wider hover:opacity-75 flex items-center">
                <span
                    class="whitespace-nowrap"
                    :class="{ '!text-base-content/70 font-semibold': props.label }"
                    >{{ label }}</span
                >
                <a
                    v-if="label"
                    :href="link"
                    class="z-30 p-1 cursor-pointer text-gray-300 bg-gray-800 border border-gray-600 shadow-lg rounded-full opacity-0 group-hover/line:opacity-100 sticky ml-1"
                >
                    <IconPencil class="size-4" />
                </a>
            </div>
        </div>
    </div>
</template>
