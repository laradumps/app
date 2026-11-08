<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, provide, ref, watch } from 'vue';
import { XMarkIcon } from '@heroicons/vue/20/solid';
import ClearAll from '@/components/common/ClearAll.vue';
import NavBarSSH from '@/components/navbar/NavBarSSH.vue';
import NavBarSettings from '@/components/navbar/NavBarSettings.vue';
import NavBarAlwaysOnTop from '@/components/navbar/NavBarAlwaysOnTop.vue';
import NavBarSavedDumps from '@/components/navbar/NavBarSavedDumps.vue';
import NavBarEnvironments from '@/components/navbar/NavBarEnvironments.vue';
import NavBarProjectSwitcher from '@/components/navbar/NavBarProjectSwitcher.vue';
import { useGlobalSearchStore } from '@/store/global-search';
import { usePausePayloadStore } from '@/store/pauses';
import { useSettingsStore } from '@/store/settings';

const menuView = ref('root');
provide('menuView', menuView);

const globalSearch = useGlobalSearchStore();
const pauseStore = usePausePayloadStore();
const settingsStore = useSettingsStore();

const rootRef = ref<HTMLElement | null>(null);
const inputRef = ref<HTMLInputElement | null>(null);
const menuRef = ref<HTMLElement | null>(null);
const menuOpen = ref(false);
const query = ref(globalSearch.search);

const shortcut = computed(() => settingsStore.settings.shortcuts?.global_search?.originalValue ?? '⌘+K');

let debounce: ReturnType<typeof setTimeout> | undefined;

watch(query, (value) => {
    clearTimeout(debounce);
    debounce = setTimeout(() => (globalSearch.search = value), 150);
});

watch(
    () => globalSearch.search,
    (value) => {
        if (value !== query.value) query.value = value;
    }
);

const openMenu = async () => {
    menuOpen.value = true;
    await nextTick();
    inputRef.value?.focus();
};

const onEscape = () => {
    if (menuOpen.value) menuOpen.value = false;
    else if (query.value) query.value = '';
    else inputRef.value?.blur();
};

const onMenuClick = (e: MouseEvent) => {
    if (!(e.target as HTMLElement).closest('[data-keep-open]')) menuOpen.value = false;
};

const onMenuEscape = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement).closest('dialog')) return;
    if (menuView.value !== 'root') {
        menuView.value = 'root';
        return;
    }
    menuOpen.value = false;
    inputRef.value?.focus();
};

watch(menuOpen, (open) => {
    if (!open) menuView.value = 'root';
});

watch(menuView, async (view, previous) => {
    if (view !== 'root') return;
    await nextTick();
    menuRef.value?.querySelector<HTMLElement>(`[data-opens="${previous}"]`)?.focus();
});

const onDocumentClick = (e: MouseEvent) => {
    if (!rootRef.value || !e.composedPath().includes(rootRef.value)) menuOpen.value = false;
};

onMounted(() => {
    document.addEventListener('click', onDocumentClick);
    window.ipcRenderer.on('app:local-shortcut-execute::global_search', openMenu);
});

onUnmounted(() => {
    clearTimeout(debounce);
    document.removeEventListener('click', onDocumentClick);
    window.ipcRenderer.removeListener('app:local-shortcut-execute::global_search', openMenu);
});
</script>

<template>
    <footer
        ref="rootRef"
        class="relative flex items-center gap-2 h-9 px-3 shrink-0 border-t border-base-content/10 text-xs text-base-content"
    >
        <button
            type="button"
            :aria-pressed="pauseStore.is_paused"
            :title="pauseStore.is_paused ? $t('status_line.paused_hint') : $t('status_line.live_hint')"
            class="inline-flex items-center gap-1.5 h-6 px-2 rounded-md cursor-pointer transition-colors"
            :class="pauseStore.is_paused ? 'bg-warning/15 text-warning' : 'text-success hover:bg-base-content/10'"
            @click="pauseStore.toggle()"
        >
            <span
                aria-hidden="true"
                class="size-1.5 rounded-full bg-current"
            ></span>
            {{ pauseStore.is_paused ? $t('status_line.paused') : $t('status_line.live') }}
        </button>

        <label class="flex flex-1 items-center gap-2 min-w-0">
            <span
                aria-hidden="true"
                class="font-mono text-primary"
                >›</span
            >
            <input
                ref="inputRef"
                v-model="query"
                type="text"
                spellcheck="false"
                :aria-label="$t('search')"
                :placeholder="$t('status_line.filter')"
                class="flex-1 min-w-0 h-7 bg-transparent outline-none font-mono text-[0.78rem] placeholder:text-base-content/45"
                @input="menuOpen = false"
                @keydown.esc="onEscape"
            />
        </label>

        <button
            v-if="query"
            type="button"
            :aria-label="$t('clear')"
            class="grid place-items-center size-6 rounded-md text-base-content/50 hover:bg-base-content/10 hover:text-base-content cursor-pointer"
            @click="query = ''"
        >
            <XMarkIcon class="size-3.5" />
        </button>

        <div
            class="contents"
            @click="menuOpen = false"
        >
            <NavBarProjectSwitcher />
        </div>

        <button
            type="button"
            :aria-label="$t('status_line.commands')"
            :aria-expanded="menuOpen"
            class="inline-flex h-6 items-center gap-px px-2 rounded-md border border-base-content/10 font-sans text-[0.7rem] font-medium leading-none text-base-content/60 hover:bg-base-content/10 hover:text-base-content cursor-pointer"
            @click="menuOpen ? (menuOpen = false) : openMenu()"
        >
            {{ shortcut.replace(/(?<=[⌘⌥⇧⌃])\+/g, '') }}
        </button>

        <div
            v-show="menuOpen"
            ref="menuRef"
            role="menu"
            :aria-label="$t('status_line.commands')"
            class="absolute right-3 bottom-10 z-400 w-56 flex flex-col p-1 rounded-lg border border-base-content/10 bg-base-100 shadow-xl"
            @click="onMenuClick"
            @keydown.esc="onMenuEscape"
        >
            <div
                v-show="menuView === 'root'"
                class="contents"
            >
                <NavBarSavedDumps />
                <NavBarAlwaysOnTop />
            </div>
            <NavBarSSH v-if="settingsStore.settings.show_ssh_button" />
            <NavBarEnvironments />
            <div
                v-show="menuView === 'root'"
                class="contents"
            >
                <ClearAll />
                <div class="my-1 h-px bg-base-content/10"></div>
                <NavBarSettings />
            </div>
        </div>
    </footer>
</template>
