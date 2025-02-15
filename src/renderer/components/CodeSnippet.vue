<script setup lang="ts">
import { computed, defineProps, onMounted, onUnmounted, ref } from "vue";
import { CodeSnippet, Payload } from "@/types/Payload";
import hljs from "highlight.js/lib/core";
import DumpLink from "@/components/DumpLink.vue";
import { useAppearanceStore } from "@/store/appearance";
import { IdeHandle } from "@/types/IdeHandle";
import IconArrowLight from "@/components/Icons/IconArrowLight.vue";

const containerSize = ref(0);
const activeFileIndex = ref(0);

const props = defineProps<{
    payload: Payload;
}>();

onMounted(() => {
    window.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
    window.removeEventListener("keydown", handleKeydown);
});

const totalFiles = computed(() => props.payload.code_snippet.length);

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
        workdir: props.payload.ide_handle.workdir,
        project_path: props.payload.ide_handle.project_path,
        real_path: codeSnippet.file,
        line: lineNumber,
        class_name: props.payload.ide_handle.class_name,
        separator: props.payload.ide_handle.separator,
        wsl_config: props.payload.ide_handle.wsl_config
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
</script>

<template>
    <div
        v-for="(codeSnippet, index) in props.payload.code_snippet"
        :key="index"
    >
        <div
            :class="{ '!font-semibold': activeFileIndex === index }"
            class="text-base-content tracking-wide font-normal break-all flex items-center gap-2 cursor-pointer hover:text-base-content"
            @click="toggleFileVisibility(index)"
        >
            <IconArrowLight
                v-if="activeFileIndex === index"
                class="size-4 font-light"
            />
            {{ getFileLineDisplay(codeSnippet) }}
        </div>

        <div
            v-if="activeFileIndex === index"
            class="code-snippet rounded-md scrollable mt-2"
            :style="{ maxWidth: containerWidth }"
        >
            <div
                :id="`current-snippet-${index}`"
                v-for="(lineContent, lineNumber) in codeSnippet.snippet"
                :key="`${lineNumber}-code`"
                :class="{ 'bg-red-500/20 shadow-lg font-normal': parseInt(lineNumber) === codeSnippet.line }"
                class="flex items-center tracking-widest leading-6 hover:!bg-red-500/20 px-2 group/line"
            >
                <DumpLink
                    class="font-normal h-full text-base-content text-[11px]"
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
.code-snippet {
    @apply bg-base-300 border border-base-content/20;
}

[data-theme="light"] .code-snippet {
    @apply !bg-white border border-base-content/10;
}

.scrollable {
    overflow-x: auto;
    overflow-y: hidden;
}
.line-number {
    @apply inline-block w-[40px] select-none text-base-content;
}

.hljs {
    @apply !bg-transparent font-normal text-xs leading-8;
}

.hljs,
.hljs-params {
    @apply !text-base-content/80;
}

.hljs-comment,
.hljs-quote {
    @apply !text-[#5c6370] italic;
}

.hljs-doctag,
.hljs-formula,
.hljs-keyword {
    @apply !text-[#c678dd];
}

.hljs-deletion,
.hljs-name,
.hljs-section,
.hljs-selector-tag,
.hljs-subst {
    @apply !text-[#e06c75];
}

.hljs-literal {
    @apply !text-[#56b6c2];
}

.hljs-addition,
.hljs-attribute,
.hljs-meta .hljs-string,
.hljs-regexp,
.hljs-meta,
.hljs-string {
    @apply !text-[#98c379];
}
.hljs-attr,
.hljs-number,
.hljs-selector-attr,
.hljs-selector-class,
.hljs-selector-pseudo,
.hljs-template-variable,
.hljs-type,
.hljs-variable {
    @apply text-rose-400  !important;
}

.hljs-bullet,
.hljs-link,
.hljs-meta,
.hljs-selector-id,
.hljs-symbol,
.hljs-title {
    @apply text-blue-400  !important;
}

.hljs-built_in,
.hljs-class,
.hljs-title.class_ {
    @apply text-orange-400  !important;
}

.hljs-emphasis {
    @apply italic;
}

.hljs-strong {
    @apply font-semibold;
}

.hljs-link {
    @apply underline;
}
</style>
