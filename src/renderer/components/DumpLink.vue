<script setup lang="ts">
import { computed, defineProps, onMounted, ref } from "vue";
import { useIDEHandler } from "@/store/ide-handler";
import IdeHandle from "@/types/IdeHandle";

const IDEHandler = useIDEHandler();

const link = ref();

onMounted(() => {
    const projectPath = props.ideHandler.project_path;
    const realPath = props.ideHandler.real_path;
    const workdir = props.ideHandler.workdir;
    const separator = props.ideHandler.separator;

    const relativePath = realPath?.replace(workdir, '');

    const linkPath = projectPath + separator + relativePath;

    if(realPath != null) {
        link.value = IDEHandler.value.replace("{filepath}", linkPath).replace("{line}", props.ideHandler.line);
    }

    window.ipcRenderer.on("changeIDE", (event, args) => {
        let ide = args.value;

        link.value = ide.replace("{filepath}", realPath).replace("{line}", props.ideHandler.line);
    });
});

const label = computed(() => {
    if (props.ideHandler.line?.toString() !== "") {
        return props.ideHandler.class_name + ":" + props.ideHandler.line;
    }

    if (props.ideHandler.real_path == null) {
        return "Tinker";
    }

    return '🤔';
});

const props = defineProps<{
    ideHandler: IdeHandle;
}>();
</script>


<template>
    <a
        :href="link"
        :title="label"
        :class="{'cursor-pointer' : link}"
        class="flex items-center group"
    >
        <div class="break-all tracking-wider hover:opacity-75">
            <span>{{ label }}</span>
        </div>
    </a>
</template>
