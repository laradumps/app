<script setup lang="ts">
import { computed, defineProps, onMounted, ref } from "vue";
import { IdeHandle } from "@/types/IdeHandle";
import IconPencil from "@/components/Icons/IconPencil.vue";
import { useCurrentProject } from "@/store/current-project";
import { useSettingsStore } from "@/store/settings";

const props = defineProps<{
    ideHandler: IdeHandle;
    label?: string;
    showIcon?: boolean;
    breakpoint: boolean;
}>();

const emit = defineEmits();

const currentProjectStore = useCurrentProject();
const settingsStore = useSettingsStore();

const link = ref();

onMounted(() => {
    link.value = generateLink();
});

const generateLink = () => {
    const ide_handler = settingsStore.settings.ide_handler ? settingsStore.settings.ide_handler : "phpstorm://open?file={filepath}&line={line}";

    const { project_path, real_path, workdir, wsl_config, base_path, line } = props.ideHandler;
    const relativePath = real_path?.replace(workdir, "").replace(project_path, "");
    let linkPath = project_path + relativePath;

    if (base_path) {
        linkPath = linkPath.replace(base_path, currentProjectStore.value);
    }

    if (real_path) {
        let link = ide_handler.replace("{filepath}", linkPath).replace("{line}", line);
        if (ide_handler.includes("wsl_config") && wsl_config) {
            link = link.replace("{wsl_config}", wsl_config);
        }
        return link;
    }
};

const label = computed(() => {
    const { label, ideHandler } = props;
    const { class_name, real_path, line } = ideHandler;

    if (label) return label;
    if (class_name === "empty") return "";
    if (class_name === "empty" || !real_path || real_path.includes("ExecutionLoopClosure")) return "Tinker";
    if (line?.toString() !== "") return `${class_name}:${line}`;

    return "";
});

const toggleBreakpoint = () => {
    emit("toggleBreakpoint", {
        file: props.ideHandler.real_path,
        line: props.ideHandler.line
    });
};
</script>

<template>
    <div>
        <a
            v-if="!showIcon"
            :href="label === 'Tinker' ? '#' : link"
            :title="label"
            :class="{ 'cursor-pointer': link && label !== 'Tinker' }"
            class="flex items-center group"
            @click.stop
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
            class="flex items-center group h-[32px]"
        >
            <div class="text-right w-16 tracking-wider hover:opacity-75 flex items-center">
                <div
                    v-show="breakpoint"
                    @click="toggleBreakpoint"
                    class="rounded-full cursor-pointer bg-red-500 w-2 h-2 p-[.3rem]"
                ></div>
                <span
                    class="whitespace-nowrap w-full"
                    :class="{ 'text-gray-400 font-normal': label }"
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
