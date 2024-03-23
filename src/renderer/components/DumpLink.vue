<script setup lang="ts">
import { computed, defineProps, onMounted, ref, watch } from "vue";
import { useIDEHandlerStore } from "@/store/ide-handler";
import IdeHandle from "@/types/IdeHandle";

const IDEHandler = useIDEHandlerStore();

const link = ref();

const generateLink = (ide: string) => {
    const projectPath = props.ideHandler.project_path;
    const realPath = props.ideHandler.real_path;
    const workdir = props.ideHandler.workdir;
    const wsl_config = props.ideHandler.wsl_config;

    const relativePath = realPath?.replace(workdir, "").replace(projectPath, "");

    const linkPath = projectPath + relativePath;

    if (realPath != null) {
        if (IDEHandler.value.includes("wsl_config")) {
            if (wsl_config != undefined) {
                link.value = ide.replace("{wsl_config}", wsl_config).replace("{filepath}", linkPath).replace("{line}", props.ideHandler.line);

                return;
            }

            link.value = ide.replace("{filepath}", linkPath).replace("{line}", props.ideHandler.line);

            return;
        }

        link.value = ide.replace("{filepath}", linkPath).replace("{line}", props.ideHandler.line);
    }
};

onMounted(() => {
    generateLink(IDEHandler.value);
});

const label = computed(() => {
    if (props.ideHandler.line?.toString() !== "") {
        return props.ideHandler.class_name + ":" + props.ideHandler.line;
    }

    if (props.ideHandler.real_path == null) {
        return "Tinker";
    }

    return "";
});

const props = defineProps<{
    ideHandler: IdeHandle;
}>();

watch(IDEHandler, (value) => {
    const ide = value.value;

    generateLink(ide);
});
</script>

<template>
    <a
        :href="link"
        :title="label"
        :class="{ 'cursor-pointer': link }"
        class="flex items-center group cursor-pointer"
    >
        <span class="break-all tracking-wider hover:opacity-75">
            <span>{{ label }}</span>
        </span>
    </a>
</template>
