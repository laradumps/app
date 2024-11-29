<script setup lang="ts">
import { computed, defineProps, ref } from "vue";
import { Payload } from "@/types/Payload";
import hljs from "highlight.js/lib/core";
import DumpLink from "@/components/DumpLink.vue";

const props = defineProps<{
    payload: Payload;
}>();

const activeFileIndex = ref(0);

const toggleFileVisibility = (index: number) => {
    activeFileIndex.value = activeFileIndex.value === index ? null : index;
};

const getFileLineDisplay = (codeSnippet: any) => {
    return `${codeSnippet.route} ${codeSnippet.line}`;
};

const getLineContent = (lineContent: string) => {
    return hljs.highlight(lineContent, { language: "php" }).value;
};

const containerSize = ref(0);
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
            :class="{ 'font-semibold': activeFileIndex === index }"
            class="text-base-content/80 !font-normal break-all flex items-center gap-2 cursor-pointer hover:text-base-content"
            @click="toggleFileVisibility(index)"
        >
            {{ getFileLineDisplay(codeSnippet) }}
            <span
                v-if="activeFileIndex === index"
                class="rounded-full size-[0.50rem] bg-success"
            ></span>
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
                :class="{ 'bg-red-500/40 shadow-lg font-semibold': parseInt(lineNumber) === codeSnippet.line }"
                class="flex items-center tracking-widest leading-6 hover:!bg-red-500/20 px-2 group/line"
            >
                <DumpLink
                    class="font-normal h-full text-base-content text-[11px]"
                    :label="lineNumber"
                    :show-icon="true"
                    :ide-handler="{
                        workdir: payload.ide_handle.workdir,
                        project_path: payload.ide_handle.project_path,
                        real_path: codeSnippet.file,
                        line: lineNumber,
                        class_name: payload.ide_handle.class_name,
                        separator: payload.ide_handle.separator,
                        wsl_config: payload.ide_handle.wsl_config
                    }"
                />
                <span
                    class="language-php py-1.5 highlight whitespace-pre hljs h-full text-xs text-primary font-normal"
                    v-html="getLineContent(lineContent)"
                ></span>
            </div>
        </div>
    </div>
</template>
<style>
.code-snippet {
    @apply bg-base-300;
}

[data-theme="light"] .code-snippet {
    @apply !bg-white border;
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
    color: #abb2bf !important;
}

.hljs-comment,
.hljs-quote {
    color: #5c6370 !important;
    font-style: italic !important;
}

.hljs-doctag,
.hljs-formula,
.hljs-keyword {
    color: #c678dd !important;
}

.hljs-deletion,
.hljs-name,
.hljs-section,
.hljs-selector-tag,
.hljs-subst {
    color: #e06c75 !important;
}

.hljs-literal {
    color: #56b6c2 !important;
}

.hljs-addition,
.hljs-attribute,
.hljs-meta .hljs-string,
.hljs-regexp,
.hljs-string {
    color: #98c379 !important;
}
.hljs-attr,
.hljs-number,
.hljs-selector-attr,
.hljs-selector-class,
.hljs-selector-pseudo,
.hljs-template-variable,
.hljs-type,
.hljs-variable {
    color: #d19a66 !important;
}

.hljs-bullet,
.hljs-link,
.hljs-meta,
.hljs-selector-id,
.hljs-symbol,
.hljs-title {
    color: #61aeee !important;
}

.hljs-built_in,
.hljs-class .hljs-title,
.hljs-title.class_ {
    color: #e6c07b !important;
}

.hljs-emphasis {
    font-style: italic !important;
}

.hljs-strong {
    font-weight: 700 !important;
}

.hljs-link {
    text-decoration: underline;
}
</style>
