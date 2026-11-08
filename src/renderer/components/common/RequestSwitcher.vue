<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, useId, watch } from 'vue';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/20/solid';
import { MagnifyingGlassIcon } from '@heroicons/vue/24/outline';
import { formatDuration, httpMethodColor } from '@/components/laravel/profile/profileHelpers';

dayjs.extend(relativeTime);

type Item = {
    id: string;
    method: string | null;
    label: string;
    date: string | dayjs.Dayjs | null;
    count: number;
    duration: number;
};

const props = defineProps<{ items: Item[]; countLabel: string }>();
const selected = defineModel<string | null>();

const uid = useId();
const open = ref(false);
const search = ref('');
const active = ref(0);
const rootRef = ref<HTMLElement | null>(null);
const triggerRef = ref<HTMLButtonElement | null>(null);
const inputRef = ref<HTMLInputElement | null>(null);
const listRef = ref<HTMLElement | null>(null);

const position = computed(() => props.items.findIndex((item) => item.id === selected.value));
const current = computed(() => props.items[position.value] ?? null);

const filtered = computed(() => {
    const total = props.items.length;
    const query = search.value.trim().toLowerCase();
    return props.items
        .map((item, index) => ({ ...item, n: total - index }))
        .filter((item) => !query || `${item.method ?? ''} ${item.label}`.toLowerCase().includes(query));
});

watch(search, () => (active.value = 0));

const isSlow = (ms: number) => ms >= 100;

const columns =
    'grid grid-cols-[3.5rem_minmax(0,1fr)_auto_3.5rem_4.5rem] @lg:grid-cols-[2rem_3.5rem_minmax(0,1fr)_auto_4rem_3.5rem_4.5rem] gap-2';

const step = (delta: number) => {
    const target = props.items[position.value + delta];
    if (target) selected.value = target.id;
};

const scrollToActive = () => listRef.value?.children[active.value]?.scrollIntoView({ block: 'nearest' });

const toggle = async () => {
    open.value = !open.value;
    if (!open.value) return;
    search.value = '';
    await nextTick();
    active.value = Math.max(0, position.value);
    inputRef.value?.focus();
    scrollToActive();
};

const close = () => {
    open.value = false;
    triggerRef.value?.focus();
};

const choose = (id: string) => {
    selected.value = id;
    close();
};

const onKeydown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const next = active.value + (e.key === 'ArrowDown' ? 1 : -1);
        active.value = Math.min(filtered.value.length - 1, Math.max(0, next));
        nextTick(scrollToActive);
    } else if (e.key === 'Enter' && filtered.value[active.value]) {
        choose(filtered.value[active.value].id);
    } else if (e.key === 'Escape') {
        e.stopPropagation();
        close();
    }
};

const onDocumentClick = (e: MouseEvent) => {
    if (open.value && rootRef.value && !e.composedPath().includes(rootRef.value)) open.value = false;
};

onMounted(() => document.addEventListener('click', onDocumentClick));
onUnmounted(() => document.removeEventListener('click', onDocumentClick));
</script>

<template>
    <div
        ref="rootRef"
        class="@container relative shrink-0 flex items-center gap-1 px-3 h-10 border-b border-base-content/10"
    >
        <button
            type="button"
            :aria-label="$t('switcher.previous')"
            :title="$t('switcher.previous')"
            :disabled="position >= items.length - 1"
            class="grid place-items-center size-7 shrink-0 rounded-md text-base-content/60 hover:bg-base-content/10 hover:text-base-content cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
            @click="step(1)"
        >
            <ChevronLeftIcon class="size-4" />
        </button>

        <button
            ref="triggerRef"
            type="button"
            aria-haspopup="listbox"
            :aria-expanded="open"
            class="flex items-center gap-2 h-7 px-2 min-w-0 max-w-[60%] rounded-md hover:bg-base-content/10 cursor-pointer"
            :class="{ 'bg-base-content/10': open }"
            @click="toggle"
        >
            <span
                v-if="current?.method"
                class="shrink-0 px-1.5 py-0.5 rounded font-mono text-[10px] font-semibold"
                :class="httpMethodColor(current.method)"
            >
                {{ current.method }}
            </span>
            <span class="truncate text-xs">{{ current?.label }}</span>
            <span class="@max-md:hidden shrink-0 font-mono text-[0.7rem] text-base-content/45 tabular-nums">
                {{ items.length - position }}/{{ items.length }}
            </span>
            <ChevronDownIcon class="size-3.5 shrink-0 text-base-content/45" />
        </button>

        <button
            type="button"
            :aria-label="$t('switcher.next')"
            :title="$t('switcher.next')"
            :disabled="position <= 0"
            class="grid place-items-center size-7 shrink-0 rounded-md text-base-content/60 hover:bg-base-content/10 hover:text-base-content cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
            @click="step(-1)"
        >
            <ChevronRightIcon class="size-4" />
        </button>

        <div class="ml-auto flex items-center gap-2 min-w-0">
            <slot />
        </div>

        <div
            v-if="open"
            class="absolute left-3 top-full z-50 mt-1 flex flex-col w-[min(560px,calc(100%-1.5rem))] p-2 rounded-xl border border-base-content/10 bg-base-200 shadow-xl"
            @keydown="onKeydown"
        >
            <label class="input input-sm flex items-center gap-2 w-full h-8 mb-1">
                <MagnifyingGlassIcon class="size-3.5 opacity-50" />
                <input
                    ref="inputRef"
                    v-model="search"
                    type="text"
                    role="combobox"
                    aria-autocomplete="list"
                    :aria-controls="`${uid}-list`"
                    :aria-expanded="true"
                    :aria-activedescendant="filtered[active] ? `${uid}-${active}` : undefined"
                    class="grow text-xs"
                    :placeholder="$t('switcher.filter', { n: items.length })"
                />
            </label>

            <div
                aria-hidden="true"
                class="px-2 h-5 items-center text-[10px] text-base-content/35"
                :class="columns"
            >
                <span class="col-start-4 @lg:col-start-6 text-right truncate">{{ countLabel }}</span>
                <span class="text-right">{{ $t('switcher.duration') }}</span>
            </div>

            <ul
                :id="`${uid}-list`"
                ref="listRef"
                role="listbox"
                class="max-h-[60vh] overflow-y-auto"
            >
                <li
                    v-for="(item, index) in filtered"
                    :id="`${uid}-${index}`"
                    :key="item.id"
                    role="option"
                    :aria-selected="item.id === selected"
                    class="items-center h-8 px-2 rounded-md text-xs cursor-pointer"
                    :class="[
                        columns,
                        index === active ? 'bg-base-content/10' : '',
                        item.id === selected ? 'text-primary' : 'text-base-content/80'
                    ]"
                    @mouseenter="active = index"
                    @click="choose(item.id)"
                >
                    <span class="@max-lg:hidden font-mono text-base-content/40 tabular-nums">#{{ item.n }}</span>
                    <span>
                        <span
                            v-if="item.method"
                            class="px-1.5 py-0.5 rounded font-mono text-[10px] font-semibold"
                            :class="httpMethodColor(item.method)"
                        >
                            {{ item.method }}
                        </span>
                    </span>
                    <span class="truncate">{{ item.label }}</span>
                    <span class="flex items-center gap-1">
                        <slot
                            name="flags"
                            :item="item"
                        />
                    </span>
                    <span
                        class="@max-lg:hidden font-mono text-base-content/50 tabular-nums"
                        :title="item.date ? dayjs(item.date).fromNow() : undefined"
                    >
                        {{ item.date ? dayjs(item.date).format('HH:mm:ss') : '' }}
                    </span>
                    <span class="font-mono text-right text-base-content/60 tabular-nums">{{ item.count }}</span>
                    <span
                        class="font-mono text-right tabular-nums"
                        :class="{ 'text-warning': isSlow(item.duration) }"
                    >
                        {{ formatDuration(item.duration) }}
                    </span>
                </li>
                <li
                    v-if="filtered.length === 0"
                    class="py-6 text-center text-xs text-base-content/40"
                >
                    {{ $t('no_records_found') }}
                </li>
            </ul>

            <p class="mt-1 px-2 text-[10px] text-base-content/35">{{ $t('switcher.hint') }}</p>
        </div>
    </div>
</template>
