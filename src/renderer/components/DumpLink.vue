<template>
    <a
        :href="link"
        :title="label"
        class="flex items-center group"
    >
        <div class="break-all tracking-wider hover:opacity-75 cursor-pointer">
            <span>{{ label }}</span>
        </div>
    </a>
</template>

<script setup lang="ts">
import { computed, defineProps, onMounted, ref } from "vue";
import { useIDEHandler } from "@/store/ide-handler";
import IdeHandle from "@/types/IdeHandle";

const IDEHandler = useIDEHandler();

const link = ref();

onMounted(() => {
    const path = props.ideHandler.project_path

    link.value = IDEHandler.value.replace("{filepath}", path).replace("{line}", props.ideHandler.line);

    window.ipcRenderer.on("changeIDE", (event, args) => {
        let ide = args.value;

        link.value = ide.replace("{filepath}", props.ideHandler.real_path).replace("{line}", props.ideHandler.line);
    });
});

const label = computed(() => {
    if (props.ideHandler.line?.toString() !== "") {
        return props.ideHandler.class_name + ":" + props.ideHandler.line;
    }

    if (props.ideHandler.class_name === "Tinker") {
        return "Tinker";
    }

    return null;
});

const props = defineProps<{
    ideHandler: IdeHandle;
}>();
</script>
