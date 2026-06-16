<script setup lang="ts">
import { ref, computed, watch, useSlots, Fragment, nextTick, onMounted, onBeforeUnmount } from 'vue';

const props = defineProps({
    modelValue: [String, Number],
    placeholder: [String]
});

const emit = defineEmits(['update:modelValue', 'change']);

const slots = useSlots();
const open = ref(false);
const dropUp = ref(false);
const maxH = ref(288);
const rootRef = ref<HTMLElement | null>(null);

type Opt = { value: string | number; label: string; disabled: boolean };

const textOf = (children: any): string => {
    if (children == null) return '';
    if (typeof children === 'string' || typeof children === 'number') return String(children);
    if (Array.isArray(children)) return children.map(textOf).join('');
    if (typeof children === 'object' && 'children' in children) return textOf(children.children);
    return '';
};

const flatten = (nodes: any[], acc: Opt[]) => {
    for (const node of nodes ?? []) {
        if (!node || typeof node !== 'object') continue;
        if (node.type === Fragment || Array.isArray(node.children)) {
            flatten(Array.isArray(node.children) ? node.children : [], acc);
            continue;
        }
        if (node.type === 'option') {
            const value = node.props?.value ?? '';
            const disabled = node.props ? 'disabled' in node.props : false;
            if (value === '') continue;
            acc.push({ value, label: textOf(node.children).trim(), disabled });
        }
    }
};

const options = computed<Opt[]>(() => {
    const acc: Opt[] = [];
    flatten(slots.default ? slots.default() : [], acc);
    return acc;
});

const selectedLabel = computed(() => {
    const match = options.value.find((o) => String(o.value) === String(props.modelValue));
    return match ? match.label : (props.placeholder ?? '');
});

const hasValue = computed(() => options.value.some((o) => String(o.value) === String(props.modelValue)));

const reposition = () => {
    const trigger = rootRef.value?.querySelector('button');
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const margin = 8;
    const below = window.innerHeight - rect.bottom - margin;
    const above = rect.top - margin;
    dropUp.value = below < 200 && above > below;
    maxH.value = Math.max(120, Math.min(288, dropUp.value ? above : below));
};

const choose = (opt: Opt) => {
    if (opt.disabled) return;
    emit('update:modelValue', opt.value);
    emit('change', opt.value);
    open.value = false;
};

const toggle = async () => {
    open.value = !open.value;
    if (open.value) {
        await nextTick();
        reposition();
    }
};

const onDocClick = (e: MouseEvent) => {
    if (open.value && rootRef.value && !rootRef.value.contains(e.target as Node)) open.value = false;
};
const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') open.value = false;
};
const onReflow = () => {
    if (open.value) reposition();
};

onMounted(() => {
    document.addEventListener('click', onDocClick, true);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onReflow);
    window.addEventListener('scroll', onReflow, true);
});
onBeforeUnmount(() => {
    document.removeEventListener('click', onDocClick, true);
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', onReflow);
    window.removeEventListener('scroll', onReflow, true);
});

watch(
    () => props.modelValue,
    () => {}
);
</script>

<template>
    <div
        ref="rootRef"
        class="dropdown w-full"
        :class="{ 'dropdown-open': open, 'dropdown-top': dropUp }"
    >
        <button
            type="button"
            @click="toggle"
            class="select select-bordered select-sm w-full text-left flex items-center justify-between"
            :class="{ 'text-base-content/50': !hasValue }"
        >
            <span class="truncate">{{ selectedLabel }}</span>
        </button>
        <ul
            v-show="open"
            :style="{ maxHeight: maxH + 'px' }"
            class="dropdown-content menu z-[400] p-1 w-full flex-nowrap overflow-y-auto rounded-box border border-base-content/10 bg-base-100 shadow-lg"
            :class="dropUp ? 'mb-1' : 'mt-1'"
        >
            <li
                v-for="opt in options"
                :key="String(opt.value)"
            >
                <a
                    @click="choose(opt)"
                    :class="{
                        'menu-active font-medium': String(opt.value) === String(modelValue),
                        'pointer-events-none opacity-40': opt.disabled
                    }"
                    class="whitespace-nowrap"
                >
                    {{ opt.label }}
                </a>
            </li>
        </ul>
    </div>
</template>
