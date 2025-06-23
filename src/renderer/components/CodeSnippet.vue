<script setup lang="ts">
import { computed, defineProps, onMounted, onUnmounted, ref } from "vue";
import { CodeSnippet } from "@/types/Payload";
import hljs from "highlight.js/lib/core";
import DumpLink from "@/components/dumps/DumpLink.vue";
import { IdeHandle } from "@/types/IdeHandle";
import IconArrowLight from "@/components/Icons/IconArrowLight.vue";

const containerSize = ref(0);
const activeFileIndex = ref(0);

const props = defineProps<{
    code_snippet: CodeSnippet[];
    ide_handle: IdeHandle;
}>();

onMounted(() => {
    window.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
    window.removeEventListener("keydown", handleKeydown);
});

const totalFiles = computed(() => props.code_snippet.length);

const toggleFileVisibility = (index: number) => {
    activeFileIndex.value = activeFileIndex.value === index ? null : index;
};

const navigateFiles = (direction: "next" | "prev") => {
    if (direction === "next") {
        activeFileIndex.value = (activeFileIndex.value + 1) % totalFiles.value;

        return;
    }

    if (direction === "prev") {
        activeFileIndex.value = (activeFileIndex.value - 1 + totalFiles.value) % totalFiles.value;
    }
};

const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === "ArrowRight") {
        navigateFiles("next");

        return;
    }

    if (event.key === "ArrowLeft") {
        navigateFiles("prev");
    }
};

const getFileLineDisplay = (codeSnippet: any) => {
    return codeSnippet.route;
};

const getLineContent = (lineContent: string) => {
    return hljs.highlight(lineContent, { language: "php" }).value;
};

const getIdeHandleFromStack = (codeSnippet: CodeSnippet, lineNumber: string): IdeHandle => {
    return {
        workdir: props.ide_handle.workdir,
        project_path: props.ide_handle.project_path,
        real_path: codeSnippet.file,
        line: lineNumber,
        class_name: props.ide_handle.class_name,
        separator: props.ide_handle.separator,
        wsl_config: props.ide_handle.wsl_config
    };
};

const observeContainer = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                containerSize.value = entry.contentRect.width;
            }
        });
        resizeObserver.observe(element);
    }
};

const containerWidth = computed(() => containerSize.value - 58 + "px");

observeContainer("dumps-base");

onMounted(() => {
    activeFileIndex.value = 0;
});
</script>

<template>
    <div
        v-for="(codeSnippet, index) in props.code_snippet"
        :key="index"
        class="text-xs opacity-80 p-1.5"
        :class="{ 'hover:rounded hover:bg-base-300': activeFileIndex !== index }"
    >
        <div
            :class="{
                '!font-semibold text-sm !opacity-100 !text-primary': activeFileIndex === index
            }"
            class="text-base-content tracking-wide font-normal break-all flex items-center gap-2 cursor-pointer hover:text-base-content"
            @click="toggleFileVisibility(index)"
        >
            <IconArrowLight v-if="activeFileIndex === index" />
            {{ getFileLineDisplay(codeSnippet) }}
        </div>

        <div
            v-if="activeFileIndex === index"
            class="rounded-md scrollable mt-2"
            :class="{
                'code-snippet': activeFileIndex === index
            }"
            :style="{ maxWidth: containerWidth }"
        >
            <div
                :id="`current-snippet-${index}`"
                v-for="(lineContent, lineNumber) in codeSnippet.snippet"
                :key="`${lineNumber}-code`"
                :class="{ 'bg-red-500/20 shadow-lg font-normal': parseInt(lineNumber) === codeSnippet.line }"
                class="flex items-center tracking-widest leading-6 hover:!bg-red-500/20 group/line"
            >
                <DumpLink
                    class="font-normal h-full text-base-content text-xs"
                    :label="lineNumber"
                    :show-icon="true"
                    :ide-handler="getIdeHandleFromStack(codeSnippet, lineNumber)"
                />
                <span
                    class="language-php highlight whitespace-pre hljs h-full text-xs text-primary font-normal"
                    v-html="getLineContent(lineContent)"
                ></span>
            </div>
        </div>
    </div>
</template>

<style>
@reference "./../styles.css";

.code-snippet {
    @apply bg-black border border-gray-700 rounded-lg;
}

.code-snippet .hljs {
    @apply !bg-transparent font-mono !text-xs leading-6 !text-gray-300;
}

.code-snippet .hljs-comment {
    @apply !text-gray-500 italic;
}

.code-snippet .hljs-keyword,
.hljs-selector-tag,
.hljs-doctag {
    @apply !text-[#cc7832] font-bold;
}

.code-snippet .hljs-string,
.hljs-meta .hljs-string,
.hljs-attribute {
    @apply !text-[#6a8759];
}

.code-snippet.hljs-number,
.hljs-literal,
.hljs-boolean {
    @apply !text-[#6897BB];
}

.code-snippet .hljs-title,
.hljs-function,
.hljs-built_in {
    @apply !text-[#ffc66d];
}

.code-snippet .hljs-variable,
.hljs-template-variable {
    @apply !text-[#9876AA];
}

.code-snippet .hljs-class,
.hljs-type,
.hljs-title.class_ {
    @apply !text-[#a9b7c6];
}

.code-snippet .hljs-attr,
.hljs-symbol {
    @apply !text-[#b3b3b3];
}

.code-snippet .hljs-operator {
    @apply !text-[#cc7832];
}

.code-snippet .hljs-regexp {
    @apply !text-[#b68c35];
}

.code-snippet .hljs-tag,
.hljs-name,
.hljs-section {
    @apply !text-[#e8bf6a];
}

.code-snippet .hljs-link {
    @apply !text-[#287bde] underline;
}

.code-snippet .hljs-emphasis {
    @apply italic;
}

.code-snippet .hljs-strong {
    @apply font-semibold;
}

.code-snippet .line-number {
    @apply inline-block w-[40px] select-none text-gray-500 text-right pr-2;
}

.scrollable {
    @apply overflow-auto;
}
</style>
