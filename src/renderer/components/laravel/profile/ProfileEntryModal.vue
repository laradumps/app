<script setup lang="ts">
import { ref, watch } from 'vue';
import type { ProfileEntry } from '@/store/profile';
import { XMarkIcon } from '@heroicons/vue/24/outline';
import { entryLabel, formatDuration, legendDotColor, typeColors, typeLabels } from './profileHelpers';

// Two-way bound selected entry. Setting it opens the dialog; clearing closes it.
const entry = defineModel<ProfileEntry | null>({ default: null });

const dialog = ref<HTMLDialogElement | null>(null);

watch(entry, (val) => {
    if (!dialog.value) return;
    if (val) dialog.value.showModal();
    else dialog.value.close();
});

const close = () => {
    entry.value = null;
};
</script>

<template>
    <dialog
        ref="dialog"
        class="modal modal-middle"
        @close="entry = null"
    >
        <div
            v-if="entry"
            class="modal-box rounded-xl text-sm w-11/12 max-w-lg p-0"
        >
            <!-- Header: type dot + entry name + close -->
            <div class="flex items-center gap-2.5 px-4 pt-4 pb-3">
                <span
                    class="w-3 h-3 rounded-full flex-shrink-0"
                    :class="legendDotColor(entry.type)"
                ></span>
                <span class="flex-1 font-medium truncate">{{ entryLabel(entry) }}</span>
                <button
                    class="btn btn-ghost btn-circle btn-sm"
                    :aria-label="$t('settings.close')"
                    @click="close"
                >
                    <XMarkIcon class="w-4" />
                </button>
            </div>

            <!-- Badge row: type + start/end + duration -->
            <div class="flex flex-wrap items-center gap-1.5 px-4 pb-3 border-b border-base-content/10">
                <span
                    class="badge badge-sm border-0 text-white font-mono"
                    :class="typeColors[entry.type]"
                >
                    {{ typeLabels[entry.type] || entry.type }}
                </span>
                <span class="badge badge-ghost badge-sm font-mono">
                    {{ $t('profiler.start') }} {{ formatDuration(entry.start_ms) }}
                </span>
                <span class="badge badge-ghost badge-sm font-mono">
                    {{ $t('profiler.end') }} {{ formatDuration((entry.start_ms || 0) + (entry.duration_ms || 0)) }}
                </span>
                <span class="badge badge-primary badge-sm font-mono">
                    {{ formatDuration(entry.duration_ms) }}
                </span>
            </div>

            <!-- Body -->
            <div class="p-4 space-y-3">
                <div v-if="entry.name !== entryLabel(entry)">
                    <div class="text-xs text-base-content/50 mb-1">{{ $t('profiler.name') }}</div>
                    <div class="text-sm font-medium break-all">{{ entry.name }}</div>
                </div>

                <div v-if="entry.origin?.class">
                    <div class="text-xs text-base-content/50 mb-1">{{ $t('origin') }}</div>
                    <div class="text-sm font-mono text-xs break-all">
                        {{ entry.origin.class }}<span v-if="entry.origin.method">::{{ entry.origin.method }}()</span>
                    </div>
                    <div
                        v-if="entry.origin.file"
                        class="text-xs text-base-content/60 mt-1 font-mono break-all"
                    >
                        {{ entry.origin.file }}:{{ entry.origin.line }}
                    </div>
                </div>

                <div v-if="entry.metadata && Object.keys(entry.metadata).length > 0">
                    <div class="text-xs text-base-content/50 mb-1">{{ $t('profiler.metadata') }}</div>
                    <div class="bg-base-200 rounded-lg p-3 text-xs font-mono overflow-auto max-h-40">
                        <pre>{{ JSON.stringify(entry.metadata, null, 2) }}</pre>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div class="flex justify-end px-4 py-3 border-t border-base-content/10">
                <button
                    class="btn btn-sm"
                    @click="close"
                >
                    {{ $t('settings.close') }}
                </button>
            </div>
        </div>
        <form
            method="dialog"
            class="modal-backdrop"
        >
            <button>{{ $t('settings.close') }}</button>
        </form>
    </dialog>
</template>
