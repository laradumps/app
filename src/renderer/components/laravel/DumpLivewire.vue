<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import dayjs from 'dayjs';
import VueJsonPretty from 'vue-json-pretty';
import { BoltIcon, ChevronRightIcon, FunnelIcon, PlayIcon, TrashIcon, XMarkIcon } from '@heroicons/vue/24/outline';
import { useLivewireStore, type LivewireComponent } from '@/store/livewire';
import { usePauseLivewireStore } from '@/store/pauses';
import { useCurrentProject } from '@/store/current-project';
import ViewToolbar from '@/components/common/ViewToolbar.vue';
import RequestSwitcher from '@/components/common/RequestSwitcher.vue';
import IconButton from '@/components/common/IconButton.vue';
import IconPause from '@/components/Icons/IconPause.vue';
import PauseBanner from '@/components/common/PauseBanner.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import DumpQueries from '@/components/laravel/DumpQueries.vue';
import type { Payload } from '@/types/Payload';
import { formatDuration } from '@/components/laravel/profile/profileHelpers';
import { initSfDump } from '@/utils/sfdump';

const props = defineProps<{ hideHeader?: boolean; yamlConfig?: Record<string, any> }>();

const store = useLivewireStore();
const pause = usePauseLivewireStore();
const currentProject = useCurrentProject();

const shows = (c: LivewireComponent) => !store.focus.length || store.focus.includes(c.name);

const requests = computed(() =>
    store.requests
        .map((r) => ({ ...r, components: r.components.filter(shows) }))
        .filter((r) => r.components.length)
        .reverse()
);

const pinnedId = ref<string | null>(null);
const request = computed(() => requests.value.find((r) => r.id === pinnedId.value) ?? requests.value[0] ?? null);
const selectRequest = (id: string | null | undefined) => {
    pinnedId.value = id && id !== requests.value[0]?.id ? id : null;
};

const componentId = ref<string | null>(null);
const component = computed(
    () => request.value?.components.find((c) => c.id === componentId.value) ?? request.value?.components[0] ?? null
);

const own = (c: LivewireComponent) => c.profile.filter((p) => p.kind !== 'child');
const msOf = (c: LivewireComponent) => own(c).reduce((sum, p) => sum + p.ms, 0);

const short = (value: unknown): string => {
    if (value === null || value === undefined) return 'null';
    if (Array.isArray(value)) return `array(${value.length})`;
    if (typeof value === 'object') return `object(${Object.keys(value as object).length})`;
    return typeof value === 'string' ? JSON.stringify(value) : String(value);
};
const isComplex = (value: unknown) => value !== null && typeof value === 'object';

const isListener = (method: string) => method === '__dispatch';
const callText = (call: { method: string; params: unknown[] }) =>
    isListener(call.method)
        ? String(call.params?.[0] ?? '')
        : `${call.method}(${(call.params ?? []).map(short).join(', ')})`;

const MAGIC = ['$set', '$sync', '$commit'];
const callsOf = (c: LivewireComponent) => c.calls.filter((call) => !MAGIC.includes(call.method));
const shortName = (name: string) => name.split('.').pop() ?? name;

const actionOf = (c: LivewireComponent): string => {
    if (c.action === 'mount') return 'mount';
    const calls = callsOf(c).map((call) =>
        isListener(call.method) ? `on ${call.params?.[0] ?? ''}` : `${call.method}()`
    );
    const models = Object.keys(c.updates).map((key) => `$set(${key})`);
    return [...calls, ...models].join(', ') || 'update';
};

const sizeOf = (size: number | string) =>
    typeof size === 'string' ? size : size >= 1024 ? `${(size / 1024).toFixed(1)} KB` : `${size} B`;

const items = computed(() =>
    requests.value.map((r) => ({
        id: r.id,
        method: null,
        label: `${shortName(r.components[0].name)} · ${actionOf(r.components[0])}`,
        date: r.sent_at ? dayjs(r.sent_at * 1000) : null,
        count: r.components.length,
        duration: r.components.reduce((sum, c) => sum + msOf(c), 0)
    }))
);

const COLORS: Record<string, string> = {
    hydrate: 'bg-warning',
    call: 'bg-primary',
    render: 'bg-success',
    mount: 'bg-info',
    dehydrate: 'bg-base-content/30',
    child: 'bg-secondary',
    listener: 'bg-accent'
};
const colorOf = (kind: string) => COLORS[kind] ?? 'bg-base-content/30';

const timing = computed(() => (component.value ? own(component.value) : []));
const timingTotal = computed(() => timing.value.reduce((sum, p) => sum + p.ms, 0));
const children = computed(() => component.value?.profile.filter((p) => p.kind === 'child') ?? []);

const changes = computed(() => Object.entries(component.value?.changes ?? {}));
const errors = computed(() => Object.entries(component.value?.errors ?? {}));
const updates = computed(() => Object.entries(component.value?.updates ?? {}));
const queriesTime = computed(() => component.value?.queries.reduce((sum, q) => sum + (q.time ?? 0), 0) ?? 0);
const queryPayloads = computed(
    () =>
        component.value?.queries.map((query) => ({ queries: { query, driver: query.driver } }) as unknown as Payload) ??
        []
);
const propertyCount = computed(() => Object.keys(component.value?.state ?? {}).length);

const expanded = ref(new Set<string>());
const toggleExpanded = (key: string) => {
    const next = new Set(expanded.value);
    if (!next.delete(key)) next.add(key);
    expanded.value = next;
};

const queriesOpen = ref(false);
const stateOpen = ref(false);

const bodyRef = ref<HTMLElement | null>(null);
watch([component, stateOpen], () =>
    nextTick(() =>
        bodyRef.value
            ?.querySelectorAll<HTMLElement>('pre.sf-dump[id]')
            .forEach((pre) => initSfDump(pre.id.replace('sf-dump-', '')))
    )
);

const names = computed(() => {
    const counts = new Map<string, number>();
    for (const r of store.requests) for (const c of r.components) counts.set(c.name, (counts.get(c.name) ?? 0) + 1);
    return [...counts].sort(([a], [b]) => a.localeCompare(b));
});

const canConfigure = computed(() => !!props.yamlConfig && !!currentProject.projectInfo?.path);
const captureOn = computed(() => props.yamlConfig?.observers?.livewire === true);
const setCapture = (on: boolean) => {
    if (!canConfigure.value) return;
    window.ipcRenderer.send('storage.update-section', {
        path: currentProject.projectInfo?.path,
        section: 'observers',
        values: { livewire: on }
    });
};

const clear = () => {
    if (pause.is_paused) pause.toggle();
    pinnedId.value = null;
    store.clear();
};
</script>

<template>
    <div class="flex flex-col h-full min-h-0 text-sm">
        <ViewToolbar v-if="!hideHeader || request">
            <template
                v-if="request"
                #title
            >
                <RequestSwitcher
                    :items="items"
                    :count-label="$t('livewire.components')"
                    :model-value="request.id"
                    @update:model-value="selectRequest"
                >
                    <span>{{ formatDuration(items.find((i) => i.id === request?.id)?.duration) }}</span>
                </RequestSwitcher>
            </template>

            <template #chips>
                <span
                    v-for="name in store.focus"
                    :key="name"
                    class="inline-flex items-center gap-1 h-6 pl-2 pr-1 rounded-md bg-[#fb70a9]/15 text-[#fb70a9] text-xs whitespace-nowrap"
                >
                    {{ name }}
                    <button
                        type="button"
                        class="grid place-items-center size-4 rounded hover:bg-base-content/10 cursor-pointer"
                        :aria-label="`${$t('livewire.remove_filter')} ${name}`"
                        @click="store.toggleFocus(name)"
                    >
                        <XMarkIcon class="size-3" />
                    </button>
                </span>
            </template>

            <template
                v-if="!hideHeader"
                #right
            >
                <div
                    v-if="canConfigure || names.length"
                    class="dropdown dropdown-bottom dropdown-end"
                >
                    <IconButton
                        tabindex="0"
                        role="button"
                        :label="$t('livewire.filter')"
                        variant="base"
                    >
                        <FunnelIcon
                            class="w-4"
                            :class="{ 'text-[#fb70a9]': store.focus.length }"
                        />
                    </IconButton>
                    <div
                        tabindex="0"
                        class="p-2 shadow-xl dropdown-content bg-base-300 backdrop-blur-xl rounded-xl z-[100] w-64 max-h-[70vh] overflow-y-auto"
                    >
                        <button
                            v-if="canConfigure"
                            type="button"
                            class="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-left text-xs cursor-pointer hover:bg-base-content/5"
                            @click="setCapture(!captureOn)"
                        >
                            <span
                                class="size-2 rounded-full"
                                :class="captureOn ? 'bg-success' : 'bg-base-content/20'"
                            ></span>
                            {{ $t('livewire.capture') }}
                        </button>

                        <div
                            v-if="names.length"
                            class="flex items-center justify-between px-3 pt-2 pb-1"
                        >
                            <span class="text-[9px] text-base-content/40 font-bold uppercase tracking-widest">{{
                                $t('livewire.components')
                            }}</span>
                            <button
                                v-if="store.focus.length"
                                type="button"
                                class="text-[11px] text-primary cursor-pointer"
                                @click="store.focus = []"
                            >
                                {{ $t('livewire.show_all') }}
                            </button>
                        </div>
                        <label
                            v-for="[name, count] in names"
                            :key="name"
                            class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs cursor-pointer hover:bg-base-content/5"
                        >
                            <input
                                type="checkbox"
                                class="checkbox checkbox-xs"
                                :checked="store.focus.includes(name)"
                                @change="store.toggleFocus(name)"
                            />
                            <span class="truncate flex-1">{{ name }}</span>
                            <span class="text-base-content/35 tabular-nums">{{ count }}</span>
                        </label>
                    </div>
                </div>

                <IconButton
                    :label="pause.is_paused ? $t('resume') : $t('pause')"
                    variant="base"
                    @click="pause.toggle()"
                >
                    <PlayIcon
                        v-if="pause.is_paused"
                        class="w-4 text-warning"
                    />
                    <IconPause
                        v-else
                        class="w-4"
                    />
                </IconButton>

                <IconButton
                    v-if="store.requests.length"
                    :label="$t('livewire.clear')"
                    variant="danger"
                    @click="clear"
                >
                    <TrashIcon class="w-4" />
                </IconButton>
            </template>
        </ViewToolbar>

        <PauseBanner :paused="pause.is_paused" />

        <div
            v-if="request && request.components.length > 1"
            class="flex flex-wrap items-center gap-1 px-3 py-2 max-h-24 overflow-y-auto shrink-0 border-b border-base-content/[0.06]"
        >
            <span class="mr-1 text-[11px] text-base-content/40">
                {{ $t('livewire.in_request', request.components.length) }}
            </span>
            <button
                v-for="c in request.components"
                :key="c.id"
                type="button"
                class="inline-flex items-center gap-1.5 h-6 px-2 rounded-md text-xs whitespace-nowrap cursor-pointer"
                :class="
                    c.id === component?.id
                        ? 'bg-base-content/15 text-base-content'
                        : 'text-base-content/55 hover:bg-base-content/[0.06]'
                "
                :title="c.name"
                @click="componentId = c.id"
            >
                {{ shortName(c.name) }}
                <span class="text-[10px] text-base-content/35">{{ c.action }}</span>
            </button>
        </div>

        <div
            v-if="component"
            :key="component.id"
            ref="bodyRef"
            class="flex-1 min-h-0 overflow-y-auto pb-4"
        >
            <template v-if="updates.length || callsOf(component).length">
                <h3 class="lw-label">{{ $t('livewire.action') }}</h3>
                <div
                    v-for="[key, value] in updates"
                    :key="`u-${key}`"
                    class="lw-row"
                >
                    <span class="size-1.5 rounded-full bg-info shrink-0"></span>
                    <span class="font-mono truncate">
                        {{ key }} <span class="text-base-content/35">=</span> {{ short(value) }}
                    </span>
                    <span class="ml-auto text-[11px] text-base-content/35">wire:model</span>
                </div>
                <div
                    v-for="(call, index) in callsOf(component)"
                    :key="`c-${index}`"
                    class="lw-row"
                >
                    <span
                        class="size-1.5 rounded-full shrink-0"
                        :class="isListener(call.method) ? 'bg-accent' : 'bg-primary'"
                    ></span>
                    <span class="font-mono truncate">{{ callText(call) }}</span>
                    <span
                        v-if="isListener(call.method)"
                        class="ml-auto text-[11px] text-base-content/35"
                        >{{ $t('livewire.listener') }}</span
                    >
                </div>
            </template>

            <template v-if="changes.length">
                <h3 class="lw-label">
                    {{ $t('livewire.changed') }} <span class="text-base-content/35">{{ changes.length }}</span>
                </h3>
                <div
                    v-for="[key, [before, after]] in changes"
                    :key="`d-${key}`"
                >
                    <button
                        type="button"
                        class="lw-row w-full text-left font-mono"
                        :class="{
                            'cursor-pointer hover:bg-base-content/[0.04]': isComplex(before) || isComplex(after)
                        }"
                        :aria-expanded="expanded.has(key)"
                        @click="(isComplex(before) || isComplex(after)) && toggleExpanded(key)"
                    >
                        <span class="w-28 shrink-0 truncate text-base-content/55">{{ key }}</span>
                        <span class="min-w-0 truncate">
                            <span class="text-base-content/40 line-through decoration-base-content/20">{{
                                short(before)
                            }}</span>
                            <span class="px-2 text-base-content/30">→</span>
                            <span class="text-base-content/90">{{ short(after) }}</span>
                        </span>
                    </button>
                    <div
                        v-if="expanded.has(key)"
                        class="grid grid-cols-2 gap-3 px-4 py-2 text-xs"
                    >
                        <div class="min-w-0">
                            <div class="mb-1 text-[11px] text-base-content/40">{{ $t('livewire.before') }}</div>
                            <VueJsonPretty
                                :data="before as any"
                                :deep="2"
                                :show-length="true"
                                :show-line="false"
                            />
                        </div>
                        <div class="min-w-0">
                            <div class="mb-1 text-[11px] text-base-content/40">{{ $t('livewire.after') }}</div>
                            <VueJsonPretty
                                :data="after as any"
                                :deep="2"
                                :show-length="true"
                                :show-line="false"
                            />
                        </div>
                    </div>
                </div>
            </template>

            <template v-if="errors.length">
                <h3 class="lw-label">
                    {{ $t('livewire.validation') }} <span class="text-base-content/35">{{ errors.length }}</span>
                </h3>
                <div
                    v-for="[key, messages] in errors"
                    :key="`e-${key}`"
                    class="lw-row items-start"
                >
                    <span class="size-1.5 mt-1.5 rounded-full bg-error shrink-0"></span>
                    <span class="font-mono shrink-0">{{ key }}</span>
                    <span class="text-error">{{ ([] as string[]).concat(messages).join(' ') }}</span>
                </div>
            </template>
            <template v-else-if="component.legacy?.errors">
                <h3 class="lw-label">{{ $t('livewire.validation') }}</h3>
                <div
                    class="px-4"
                    v-safe-html="component.legacy.errors"
                ></div>
            </template>

            <template v-if="component.dispatches.length">
                <h3 class="lw-label">
                    {{ $t('livewire.events') }}
                    <span class="text-base-content/35">{{ component.dispatches.length }}</span>
                </h3>
                <div
                    v-for="(event, index) in component.dispatches"
                    :key="`ev-${index}`"
                    class="lw-row"
                >
                    <span class="size-1.5 rounded-full bg-secondary shrink-0"></span>
                    <span class="font-mono shrink-0">{{ event.name }}</span>
                    <span
                        class="font-mono truncate text-base-content/45"
                        :title="JSON.stringify(event.params)"
                        >{{ event.params ? JSON.stringify(event.params) : '' }}</span
                    >
                </div>
            </template>

            <h3 class="lw-label">
                {{ $t('livewire.time') }}
                <span class="text-base-content/35">{{ timing.length ? formatDuration(timingTotal) : '' }}</span>
            </h3>
            <template v-if="timing.length">
                <div class="flex gap-0.5 h-1.5 mx-4 rounded-full overflow-hidden">
                    <span
                        v-for="(entry, index) in timing"
                        :key="index"
                        class="h-full min-w-0.5"
                        :class="colorOf(entry.kind)"
                        :style="{ width: `${timingTotal ? (entry.ms / timingTotal) * 100 : 0}%` }"
                        :title="`${entry.label} ${formatDuration(entry.ms)}`"
                    ></span>
                </div>
                <div class="flex flex-wrap gap-x-4 gap-y-1.5 px-4 pt-2.5 text-[11.5px] text-base-content/60">
                    <span
                        v-for="(entry, index) in timing"
                        :key="index"
                        class="inline-flex items-center gap-1.5"
                    >
                        <span
                            class="size-1.5 rounded-full"
                            :class="colorOf(entry.kind)"
                        ></span>
                        <span :class="{ 'font-mono': entry.kind === 'call' }">{{
                            entry.kind === 'call' ? `${entry.label}()` : entry.label
                        }}</span>
                        <span class="text-base-content/35 tabular-nums">{{ formatDuration(entry.ms) }}</span>
                    </span>
                </div>
                <div
                    v-if="children.length"
                    class="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 pt-2 text-[11.5px] text-base-content/50"
                >
                    <span class="text-base-content/35">{{ $t('livewire.inside_render') }}</span>
                    <span
                        v-for="(entry, index) in children"
                        :key="index"
                        class="inline-flex items-center gap-1.5"
                    >
                        <span class="size-1.5 rounded-full bg-secondary"></span>
                        {{ entry.label }}
                        <span class="text-base-content/35 tabular-nums">{{ formatDuration(entry.ms) }}</span>
                    </span>
                </div>
            </template>
            <p
                v-else
                class="px-4 text-xs text-base-content/40"
            >
                {{ $t('livewire.no_timing') }}
            </p>

            <div class="h-3"></div>

            <details
                v-if="component.queries.length"
                class="group"
                :open="queriesOpen"
                @toggle="queriesOpen = ($event.target as HTMLDetailsElement).open"
            >
                <summary class="lw-fold">
                    <ChevronRightIcon class="size-3 text-base-content/40 group-open:rotate-90 transition-transform" />
                    {{ $t('livewire.queries') }}
                    <span class="text-[11.5px] text-base-content/40 tabular-nums"
                        >{{ component.queries.length }} · {{ formatDuration(queriesTime) }}</span
                    >
                </summary>
                <div
                    v-if="queriesOpen"
                    class="mx-4 mb-3 rounded-lg border border-base-content/10 divide-y divide-base-content/[0.06]"
                >
                    <div
                        v-for="(query, index) in component.queries"
                        :key="index"
                        class="px-3 pt-2 pb-1"
                    >
                        <div class="flex items-center gap-2 mb-1 text-xs text-base-content/50">
                            <span
                                v-if="query.time != null"
                                class="font-mono tabular-nums"
                                >{{ query.time.toFixed(2) }}ms</span
                            >
                            <span
                                v-if="query.connectionName"
                                class="text-base-content/35"
                                >{{ query.connectionName }}</span
                            >
                        </div>
                        <DumpQueries
                            :payload="queryPayloads[index]"
                            :is-prettified="false"
                        />
                    </div>
                </div>
            </details>

            <details
                class="group"
                :open="stateOpen"
                @toggle="stateOpen = ($event.target as HTMLDetailsElement).open"
            >
                <summary class="lw-fold">
                    <ChevronRightIcon class="size-3 text-base-content/40 group-open:rotate-90 transition-transform" />
                    {{ $t('livewire.state') }}
                    <span class="text-[11.5px] text-base-content/40 tabular-nums">
                        {{ component.state ? $t('livewire.properties', propertyCount) : '' }}
                        {{ sizeOf(component.size) }}
                    </span>
                </summary>
                <div
                    v-if="stateOpen"
                    class="px-4 text-xs"
                >
                    <VueJsonPretty
                        v-if="component.state"
                        :data="component.state as any"
                        :deep="2"
                        :show-length="true"
                        :show-line="false"
                    />
                    <div
                        v-else-if="component.legacy?.state"
                        v-safe-html="component.legacy.state"
                    ></div>
                    <p
                        v-else
                        class="text-base-content/40"
                    >
                        {{ $t('livewire.state_too_big') }}
                    </p>
                </div>
            </details>
        </div>

        <div
            v-else
            class="flex-1 flex items-center justify-center p-6"
        >
            <EmptyState
                v-if="store.requests.length"
                :title="$t('livewire.focus_empty')"
                :message="store.focus.join(', ')"
            >
                <button
                    type="button"
                    class="btn btn-sm"
                    @click="store.focus = []"
                >
                    {{ $t('livewire.show_all') }}
                </button>
            </EmptyState>
            <EmptyState
                v-else-if="captureOn"
                :title="$t('livewire.waiting_title')"
                :message="$t('livewire.waiting_message')"
            />
            <EmptyState
                v-else
                :title="$t('livewire.empty_title')"
                :message="$t('livewire.empty_message')"
            >
                <template v-if="canConfigure">
                    <button
                        type="button"
                        class="btn btn-sm btn-primary gap-1.5"
                        @click="setCapture(true)"
                    >
                        <BoltIcon class="size-4" />
                        {{ $t('livewire.enable') }}
                    </button>
                    <p class="text-[11px] text-base-content/35">{{ $t('livewire.enable_hint') }}</p>
                </template>
            </EmptyState>
        </div>
    </div>
</template>

<style scoped>
@reference "./../../styles.css";

.lw-label {
    @apply flex items-center gap-1.5 px-4 pt-4 pb-1.5 text-[11px] font-medium text-base-content/40;
}

.lw-row {
    @apply flex items-center gap-2.5 px-4 py-1 min-h-7 text-[12.5px] text-base-content/85;
}

.lw-fold {
    @apply flex items-center gap-1.5 px-4 py-2 text-[12.5px] text-base-content/75 cursor-pointer list-none select-none hover:bg-base-content/[0.04];
}

.lw-fold::-webkit-details-marker {
    display: none;
}
</style>
