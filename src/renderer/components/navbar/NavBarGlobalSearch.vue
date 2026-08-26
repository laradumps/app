<script setup>
import { ref, nextTick, onMounted, onUnmounted, computed } from 'vue';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/vue/24/outline';
import { useGlobalSearchStore } from '@/store/global-search';
import { usePayloadStore } from '@/store/payload';
import { useLogStore } from '@/store/logs';
import { useJobStore } from '@/store/jobs';
import { useMailStore } from '@/store/mail';
import { useQueriesPayloadStore } from '@/store/queries';
import { useScreenStore } from '@/store/screen';
import {
    matchesDumpSearch,
    matchesLogSearch,
    matchesJobSearch,
    matchesMailSearch,
    matchesQuerySearch
} from '@/utils/searchMatchers';

const globalSearch = useGlobalSearchStore();

// stores for counting per-screen results
const payloadStore = usePayloadStore();
const logStore = useLogStore();
const jobStore = useJobStore();
const mailStore = useMailStore();
const queriesStore = useQueriesPayloadStore();
const screenStore = useScreenStore();

const usingKeyboard = ref(false);
const showInput = ref(false);
const inputRef = ref(null);
const badgeRefs = ref([]);

let onGlobalKeydown;
let onGlobalMousedown;

const setBadgeRef = (el, i) => {
    if (el) badgeRefs.value[i] = el;
};

const focusBadge = (i) => {
    const size = badges.value.length;
    if (size === 0) return;
    const idx = (i + size) % size;
    nextTick(() => badgeRefs.value[idx]?.focus());
};

const activateBadge = (badge) => {
    const map = { dumps: 'home', logs: 'logs', jobs: 'jobs', mail: 'mail', queries: 'queries' };
    const target = map[badge.key] || badge.key;
    screenStore.activeScreen?.(target);

    payloadStore.filteredPayload = payloadStore.payload.filter(
        (payload) => payload.type !== 'screen' && payload.to_screen?.screen_name === target
    );

    showInput.value = false;
};

const onBadgeKeydown = (e, badge, index) => {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        activateBadge(badge);
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        focusBadge(index + 1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        focusBadge(index - 1);
    } else if (e.key === 'Home') {
        e.preventDefault();
        focusBadge(0);
    } else if (e.key === 'End') {
        e.preventDefault();
        focusBadge(badges.value.length - 1);
    }
};

const keyboardFocusClasses = computed(() =>
    usingKeyboard.value
        ? 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/50 focus-visible:outline-offset-2'
        : ''
);

const toggleInputVisibility = async () => {
    showInput.value = !showInput.value;
    if (showInput.value) {
        await nextTick();
        inputRef.value?.focus();
    }
};

const handleKeydown = (event) => {
    if (event.key === 'Escape') {
        showInput.value = false;
    }
};

// Close when clicking outside the modal content
const handleClickOutside = (event) => {
    if (showInput.value && !event.target.closest('.global-search-content')) {
        showInput.value = false;
    }
};

const searchTerm = computed(() => globalSearch.search.toLowerCase());

const counts = computed(() => {
    const term = searchTerm.value.trim();

    if (!term) {
        return { dumps: 0, logs: 0, jobs: 0, mail: 0, queries: 0 };
    }

    const dumps = payloadStore.payload.filter((dump) => matchesDumpSearch(dump, term)).length;
    const logs = Object.values({ ...logStore.logs, ...logStore.incoming }).filter((log) =>
        matchesLogSearch(log, term)
    ).length;
    const jobs = Object.values({ ...jobStore.jobs, ...jobStore.incoming }).filter((job) =>
        matchesJobSearch(job, term)
    ).length;
    const mail = mailStore.mails.filter((m) => matchesMailSearch(m, term)).length;
    const queries = queriesStore.payload.filter((q) => matchesQuerySearch(q, term)).length;

    return { dumps, logs, jobs, mail, queries };
});

const badges = computed(() => {
    return [
        { key: 'dumps', label: 'home', count: counts.value.dumps },
        { key: 'logs', label: 'logs', count: counts.value.logs },
        { key: 'jobs', label: 'jobs', count: counts.value.jobs },
        { key: 'mail', label: 'mail', count: counts.value.mail },
        { key: 'queries', label: 'queries', count: counts.value.queries }
    ].filter((b) => b.count > 0);
});

onMounted(() => {
    window.addEventListener('keydown', handleKeydown);
    document.addEventListener('click', handleClickOutside);

    // track keyboard vs mouse to style focus ring only for keyboard users
    onGlobalKeydown = (e) => {
        if (['Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
            usingKeyboard.value = true;
        }
    };
    onGlobalMousedown = () => {
        usingKeyboard.value = false;
    };
    window.addEventListener('keydown', onGlobalKeydown, true);
    window.addEventListener('mousedown', onGlobalMousedown, true);

    window.ipcRenderer?.on('app:local-shortcut-execute::global_search', async () => {
        if (!showInput.value) {
            showInput.value = true;
            await nextTick();
            inputRef.value?.focus();
        } else {
            await nextTick();
            inputRef.value?.focus();
        }
    });
});

onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown);
    document.removeEventListener('click', handleClickOutside);
    if (onGlobalKeydown) window.removeEventListener('keydown', onGlobalKeydown, true);
    if (onGlobalMousedown) window.removeEventListener('mousedown', onGlobalMousedown, true);
    window.ipcRenderer?.removeAllListeners?.('app:local-shortcut-execute::global_search');
});
</script>

<template>
    <div>
        <button
            tabindex="0"
            class="p-2 hover:bg-base-200 text-base-content cursor-pointer rounded-md"
            @click.stop="toggleInputVisibility"
            aria-label="Open global search"
        >
            <MagnifyingGlassIcon
                class="size-4"
                :class="{ 'text-primary': showInput || globalSearch.search.length > 0 }"
            />
        </button>

        <!-- Spotlight-like full-screen overlay -->
        <div
            v-show="showInput"
            class="fixed inset-0 !z-[440] bg-base-300/30 backdrop-blur-md flex items-start justify-center p-6"
            @click.self="showInput = false"
            role="dialog"
            aria-modal="true"
        >
            <button
                class="absolute top-0 right-0 mr-8 mt-8 btn btn-sm btn-circle btn-soft"
                @click.stop="showInput = false"
                aria-label="Close search"
            >
                <XMarkIcon class="w-5 h-5" />
            </button>
            <div
                class="global-search-content w-full max-w-2xl bg-base-300 rounded-xl shadow-xl p-4 mt-24 space-y-4 overflow-y-auto"
                @click.stop
            >
                <label class="input w-full">
                    <MagnifyingGlassIcon class="size-4" />
                    <input
                        ref="inputRef"
                        v-model="globalSearch.search"
                        type="text"
                        class="w-full font-normal font-sans p-3"
                        placeholder="Search"
                        @keydown.enter.prevent="showInput = false"
                        @keydown.down.prevent="focusBadge(0)"
                    />
                </label>

                <div
                    v-if="badges.length && searchTerm"
                    class="flex flex-wrap gap-2"
                >
                    <button
                        v-for="(badge, index) in badges"
                        :key="badge.key"
                        type="button"
                        :ref="(el) => setBadgeRef(el, index)"
                        class="badge badge-soft capitalize cursor-pointer select-none border border-base-content/20 hover:border-base-content/40 transition-colors"
                        :class="keyboardFocusClasses"
                        @click="activateBadge(badge)"
                        @keydown="onBadgeKeydown($event, badge, index)"
                        :aria-label="`Open ${badge.label} screen`"
                    >
                        {{ badge.label }}
                        <span class="font-semibold">{{ badge.count }}</span>
                    </button>
                </div>

                <div
                    v-if="searchTerm && !badges.length"
                    class="text-base font-sans"
                >
                    {{ $t('no_records_found') }}
                </div>
            </div>
        </div>
    </div>
</template>
