<template>
    <a
        :href="link"
        :title="title"
        class="flex items-center group"
    >
        <div class="break-all tracking-wider hover:opacity-75 cursor-pointer">
            <span>{{ value }}</span>
        </div>
    </a>
</template>

<script setup lang="ts">
import { defineProps, onMounted, ref } from "vue";
import { useIDEHandler } from "@/store/ide-handler";

const IDEHandler = useIDEHandler();

const link = ref();

onMounted(() => {
    link.value = IDEHandler.value.replace("{filepath}", props.ideHandler.path).replace("{line}", props.ideHandler.line);

    window.ipcRenderer.on("changeIDE", (event, args) => {
        let ide = args.value;

        link.value = ide.replace("{filepath}", props.ideHandler.path).replace("{line}", props.ideHandler.line);
    });
});

const props = defineProps({
    ideHandler: {
        type: Object
    },
    href: {
        type: String,
        default: null,
        required: true
    },
    value: {
        type: String,
        default: null,
        required: true
    },
    title: {
        type: String,
        default: null
    }
});
</script>
