<script setup lang="ts">
import { defineProps, onMounted, ref, onUnmounted, computed } from 'vue';
import { CodeSnippet } from '@/types/Payload';
import hljs from 'highlight.js/lib/core';
import DumpLink from '@/components/dumps/DumpLink.vue';
import { IdeHandle } from '@/types/IdeHandle';
import IconChevronRight from '@/components/Icons/IconChevronRight.vue';

const activeFileIndex = ref(0);
const showAllFrames = ref(false);

const props = defineProps<{
    code_snippet: CodeSnippet[];
    ide_handle: IdeHandle;
}>();

const toggleFileVisibility = (index: number) => {
    activeFileIndex.value = activeFileIndex.value === index ? -1 : index;
};

const getFileLineDisplay = (codeSnippet: any) => {
    return codeSnippet.route;
};

const getLineContent = (lineContent: string) => {
    return hljs.highlight(lineContent, { language: 'php' }).value;
};

const getIdeHandleFromStack = (codeSnippet: CodeSnippet, lineNumber: string): IdeHandle => {
    return {
        base_path: '',
        workdir: props.ide_handle.workdir,
        project_path: props.ide_handle.project_path,
        real_path: codeSnippet.file,
        line: lineNumber,
        class_name: props.ide_handle.class_name,
        separator: props.ide_handle.separator,
        wsl_config: props.ide_handle.wsl_config
    };
};

const visibleFrames = computed(() => {
    const list = props.code_snippet || [];

    if (showAllFrames.value) {
        return list.map((s, i) => ({ codeSnippet: s, index: i }));
    }

    return list.slice(0, 5).map((s, i) => ({ codeSnippet: s, index: i }));
});

const navigateToNextFile = () => {
    if (activeFileIndex.value < props.code_snippet.length - 1) {
        activeFileIndex.value++;
    }
};

const navigateToPreviousFile = () => {
    if (activeFileIndex.value > 0) {
        activeFileIndex.value--;
    }
};

const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
        activeFileIndex.value = 0;
        event.preventDefault();
    } else if (event.key === 'ArrowDown') {
        navigateToNextFile();
        event.preventDefault();
    } else if (event.key === 'ArrowUp') {
        navigateToPreviousFile();
        event.preventDefault();
    }
};

const toggleShowAllFrames = () => {
    showAllFrames.value = !showAllFrames.value;
};

onMounted(() => {
    activeFileIndex.value = 0;
    window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown);
});
</script>

<template>
    <div class="space-y-1">
        <div
            v-for="frame in visibleFrames"
            :key="frame.index"
            class="border border-base-content/10 rounded-md overflow-hidden"
        >
            <div
                :class="{
                    '!font-semibold !text-primary': activeFileIndex === frame.index
                }"
                class="text-xs px-2 py-1 text-base-content tracking-wide font-normal break-all flex items-center gap-2 cursor-pointer hover:bg-base-200 transition-colors"
                @click="toggleFileVisibility(frame.index)"
            >
                <span
                    class="transform transition-transform"
                    :class="{ 'rotate-90': activeFileIndex === frame.index }"
                >
                    <IconChevronRight class="!size-3" />
                </span>
                <span class="truncate">{{ getFileLineDisplay(frame.codeSnippet) }}</span>
            </div>

            <div
                v-if="activeFileIndex === frame.index"
                class="code-snippet overflow-x-auto"
            >
                <div
                    v-for="(lineContent, lineNumber) in frame.codeSnippet.snippet"
                    :key="`${lineNumber}-code`"
                    :class="{ 'bg-red-500/20 shadow-lg font-normal': parseInt(lineNumber) === frame.codeSnippet.line }"
                    class="flex items-start tracking-widest leading-6 hover:!bg-red-500/20 group/line min-w-max"
                >
                    <DumpLink
                        class="font-normal h-full text-base-content text-xs flex-shrink-0"
                        :label="lineNumber"
                        :show-icon="true"
                        :ide-handler="getIdeHandleFromStack(frame.codeSnippet, lineNumber)"
                    />
                    <span
                        class="language-php highlight whitespace-pre hljs h-full text-xs text-primary font-normal flex-1"
                        v-html="getLineContent(lineContent)"
                    ></span>
                </div>
            </div>
        </div>

        <!-- View More / View Less -->
        <div
            v-if="props.code_snippet.length > 5"
            class="text-xs flex justify-center px-2 py-1 text-base-content tracking-wide items-center gap-2 cursor-pointer hover:bg-base-200 rounded-md select-none"
            @click="toggleShowAllFrames"
        >
            <span class="truncate">{{ showAllFrames ? 'View Less' : 'View More' }}</span>
            <span
                class="transform transition-transform"
                :class="{ 'rotate-90': showAllFrames }"
            >
                <IconChevronRight class="!size-3" />
            </span>
        </div>
    </div>
</template>

<style>
@reference "./../styles.css";

.code-snippet {
    @apply bg-black border-t border-gray-700 text-xs;
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
    @apply inline-block w-[40px] select-none text-gray-500 text-right pr-2 flex-shrink-0;
}

.scrollable {
    @apply overflow-x-auto;
}
</style>
