<script setup lang="ts">
import { onMounted, ref, onUnmounted, computed } from 'vue';
import { CodeSnippet } from '@/types/Payload';
import hljs from 'highlight.js/lib/core';
import DumpLink from '@/components/dumps/DumpLink.vue';
import { IdeHandle } from '@/types/IdeHandle';
import IconChevronRight from '@/components/Icons/IconChevronRight.vue';

const props = defineProps<{
    code_snippet: CodeSnippet[];
    ide_handle: IdeHandle;
}>();

const isVendor = (frame: CodeSnippet) => !frame.file || /\/vendor\/|eval\(\)'d/.test(frame.file);

const relative = (file: string) => {
    const root = props.ide_handle?.project_path?.replace(/\/+$/, '');
    if (root && file.startsWith(root + '/')) return file.slice(root.length + 1);

    return file.replace(
        /^.*?\/((?:app|src|vendor|routes|database|config|tests|bootstrap|resources|public|packages|modules)\/)/,
        '$1'
    );
};
const dirOf = (file: string) => relative(file).slice(0, relative(file).lastIndexOf('/') + 1);
const baseOf = (file: string) => file.slice(file.lastIndexOf('/') + 1);
const methodOf = (frame: CodeSnippet) => (frame.route && !frame.route.includes('/') ? frame.route : '');

const frames = computed(() => props.code_snippet ?? []);
const firstAppFrame = () =>
    Math.max(
        0,
        frames.value.findIndex((frame) => !isVendor(frame))
    );
const activeFileIndex = ref(firstAppFrame());
const openGroups = ref(new Set<number>());

type Row = { index: number; frame: CodeSnippet } | { group: number; count: number; open: boolean };

const rows = computed(() => {
    const rows: Row[] = [];
    let run: { index: number; frame: CodeSnippet }[] = [];

    const flush = () => {
        if (run.length > 1) {
            const open = openGroups.value.has(run[0].index);
            rows.push({ group: run[0].index, count: run.length, open });
            if (open) rows.push(...run);
        } else {
            rows.push(...run);
        }
        run = [];
    };

    frames.value.forEach((frame, index) => {
        if (index > 0 && isVendor(frame)) {
            run.push({ index, frame });
            return;
        }
        flush();
        rows.push({ index, frame });
    });
    flush();

    return rows;
});

const toggleGroup = (group: number) => {
    const groups = new Set(openGroups.value);
    groups.has(group) ? groups.delete(group) : groups.add(group);
    openGroups.value = groups;
};

const toggleFileVisibility = (index: number) => {
    activeFileIndex.value = activeFileIndex.value === index ? -1 : index;
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

const step = (delta: number) => {
    const shown = rows.value.flatMap((row) => ('index' in row ? [row.index] : []));
    const at = shown.indexOf(activeFileIndex.value);
    const next = shown[at === -1 ? 0 : at + delta];
    if (next !== undefined) activeFileIndex.value = next;
};

const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
        activeFileIndex.value = firstAppFrame();
        event.preventDefault();
    } else if (event.key === 'ArrowDown') {
        step(1);
        event.preventDefault();
    } else if (event.key === 'ArrowUp') {
        step(-1);
        event.preventDefault();
    }
};

onMounted(() => {
    window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown);
});
</script>

<template>
    <div class="rounded-lg border border-base-content/10 overflow-hidden divide-y divide-base-content/[0.06]">
        <template
            v-for="row in rows"
            :key="'index' in row ? row.index : `group-${row.group}`"
        >
            <button
                v-if="'group' in row"
                type="button"
                class="w-full flex items-center gap-2 px-2.5 h-7 text-[11px] text-base-content/40 hover:text-base-content/70 hover:bg-base-content/[0.03] cursor-pointer select-none"
                @click.stop="toggleGroup(row.group)"
            >
                <IconChevronRight
                    class="!size-3 transition-transform"
                    :class="{ 'rotate-90': row.open }"
                />
                {{ $t(row.open ? 'trace.hide_vendor' : 'trace.vendor_frames', row.count) }}
            </button>

            <div v-else>
                <div
                    class="flex items-center gap-2 px-2.5 h-8 text-xs cursor-pointer transition-colors"
                    :class="activeFileIndex === row.index ? 'bg-base-content/[0.06]' : 'hover:bg-base-content/[0.03]'"
                    :title="row.frame.file ? `${row.frame.file}:${row.frame.line}` : row.frame.route"
                    @click="toggleFileVisibility(row.index)"
                >
                    <IconChevronRight
                        class="!size-3 shrink-0 text-base-content/40 transition-transform"
                        :class="{ 'rotate-90': activeFileIndex === row.index }"
                    />
                    <span
                        v-if="row.frame.file"
                        class="flex min-w-0 font-mono"
                        :class="isVendor(row.frame) ? 'text-base-content/50' : 'text-base-content'"
                    >
                        <span class="truncate min-w-0 opacity-60">{{ dirOf(row.frame.file) }}</span>
                        <span class="shrink-0 font-medium">{{ baseOf(row.frame.file) }}:{{ row.frame.line }}</span>
                    </span>
                    <span
                        v-else
                        class="truncate min-w-0 font-mono text-base-content/50"
                        >{{ row.frame.route }}</span
                    >
                    <span
                        v-if="methodOf(row.frame)"
                        class="ml-auto pl-3 truncate min-w-0 font-mono text-[11px] text-base-content/40"
                        >{{ methodOf(row.frame) }}</span
                    >
                </div>

                <div
                    v-if="activeFileIndex === row.index"
                    class="code-snippet overflow-x-auto"
                >
                    <div
                        v-for="(lineContent, lineNumber) in row.frame.snippet"
                        :key="`${lineNumber}-code`"
                        :class="{ 'bg-red-500/20 shadow-lg font-normal': parseInt(lineNumber) === row.frame.line }"
                        class="flex items-start tracking-widest leading-6 hover:!bg-red-500/20 group/line min-w-max"
                    >
                        <DumpLink
                            class="font-normal h-full text-base-content text-xs flex-shrink-0"
                            :label="lineNumber"
                            :show-icon="true"
                            :ide-handler="getIdeHandleFromStack(row.frame, lineNumber)"
                        />
                        <span
                            class="language-php highlight whitespace-pre hljs h-full text-xs text-primary font-normal flex-1"
                            v-html="getLineContent(lineContent)"
                        ></span>
                    </div>
                </div>
            </div>
        </template>
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
.code-snippet .hljs-selector-tag,
.code-snippet .hljs-doctag {
    @apply !text-[#cc7832] font-bold;
}

.code-snippet .hljs-string,
.code-snippet .hljs-meta .hljs-string,
.code-snippet .hljs-attribute {
    @apply !text-[#6a8759];
}

.code-snippet .hljs-number,
.code-snippet .hljs-literal,
.code-snippet .hljs-boolean {
    @apply !text-[#6897BB];
}

.code-snippet .hljs-title,
.code-snippet .hljs-function,
.code-snippet .hljs-built_in {
    @apply !text-[#ffc66d];
}

.code-snippet .hljs-variable,
.code-snippet .hljs-template-variable {
    @apply !text-[#9876AA];
}

.code-snippet .hljs-class,
.code-snippet .hljs-type,
.code-snippet .hljs-title.class_ {
    @apply !text-[#a9b7c6];
}

.code-snippet .hljs-attr,
.code-snippet .hljs-symbol {
    @apply !text-[#b3b3b3];
}

.code-snippet .hljs-operator {
    @apply !text-[#cc7832];
}

.code-snippet .hljs-regexp {
    @apply !text-[#b68c35];
}

.code-snippet .hljs-tag,
.code-snippet .hljs-name,
.code-snippet .hljs-section {
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

.code-snippet .scrollable {
    @apply overflow-x-auto;
}
</style>
