<script setup lang="ts">
import { computed, defineProps, onMounted, ref } from 'vue';
import { IdeHandle } from '@/types/IdeHandle';
import IconPencil from '@/components/Icons/IconPencil.vue';
import { generateLink } from '@/utils/ideHandler';

const props = defineProps<{
    ideHandler: IdeHandle;
    label?: string;
    showIcon?: boolean;
    breakpoint?: boolean;
    truncate?: boolean;
    middleTruncate?: boolean;
    maxLength?: number;
}>();

const emit = defineEmits();

const link = ref();

onMounted(() => {
    link.value = generateLink(props.ideHandler);
});

const label = computed(() => {
    const { label, ideHandler } = props;
    const { class_name, real_path, line } = ideHandler;

    if (label) return label;
    if (class_name === 'empty') return '';
    if (class_name.includes('&platform=')) return 'JavaScript';
    if (class_name === 'empty' || !real_path || real_path.includes('ExecutionLoopClosure')) return 'Tinker';
    if (line?.toString() !== '') return `${class_name}:${line}`;

    return '';
});

const middleTruncated = (str: string, max: number): string => {
    if (str.length <= max) return str;
    const keep = max - 1;
    const front = Math.ceil(keep / 2);
    const back = Math.floor(keep / 2);
    return `${str.slice(0, front)}…${str.slice(str.length - back)}`;
};

const displayLabel = computed(() => {
    if (!props.middleTruncate) return label.value;
    return middleTruncated(label.value, props.maxLength ?? 30);
});

const toggleBreakpoint = () => {
    emit('toggleBreakpoint', {
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
            :class="{
                'cursor-pointer': link && label !== 'Tinker',
                'whitespace-pre-line': !truncate && !middleTruncate,
                'whitespace-nowrap': middleTruncate,
                truncate: truncate && !middleTruncate
            }"
            class="flex items-center group"
            @click.stop
        >
            <span
                :class="{
                    'break-all': !truncate && !middleTruncate,
                    'whitespace-nowrap': middleTruncate,
                    truncate: truncate && !middleTruncate
                }"
                class="tracking-wider hover:opacity-90 flex items-center"
            >
                <span
                    :class="{
                        '!text-gray-400': props.label,
                        truncate: !middleTruncate,
                        'whitespace-nowrap': middleTruncate
                    }"
                    >{{ displayLabel }}</span
                >
            </span>
        </a>

        <div
            v-else
            :title="label"
            class="flex items-center group"
        >
            <div class="text-right w-16 tracking-wider hover:opacity-90 flex items-center">
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
