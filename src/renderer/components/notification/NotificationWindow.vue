<script setup lang="ts">
import { nextTick, onMounted, onBeforeUnmount, ref } from 'vue';
import { CheckIcon } from '@heroicons/vue/20/solid';
import { Square2StackIcon } from '@heroicons/vue/24/outline';
import { Payload } from '@/types/Payload';
import DumpDump from '@/components/dumps/DumpDump.vue';

const items = ref<Payload[]>([]);
const root = ref<HTMLElement | null>(null);
const copiedKey = ref<string | null>(null);
let copiedTimeout: ReturnType<typeof setTimeout> | null = null;

const itemKey = (item: Payload, index: number) => `${item.sf_dump_id ?? index}-${index}`;

const resolveCopyValue = (payload: Payload): string => {
    const original = payload.dump?.original_content;
    if (original !== undefined && original !== null && original !== '') {
        return typeof original === 'string' ? original : JSON.stringify(original);
    }

    if (payload.dump?.variable_type === 'string' && payload.dump.dump != null) {
        return String(payload.dump.dump);
    }

    if (payload.sf_dump_id) {
        const el = document.getElementById(`dump-content-${payload.sf_dump_id}`);
        if (el?.innerText) {
            return el.innerText;
        }
    }

    return String(payload.dump?.dump ?? '');
};

const copyValue = (payload: Payload, index: number) => {
    const value = resolveCopyValue(payload);
    navigator.clipboard.writeText(value).then(() => {
        if (copiedTimeout) {
            clearTimeout(copiedTimeout);
        }
        copiedKey.value = itemKey(payload, index);
        copiedTimeout = setTimeout(() => {
            copiedKey.value = null;
            copiedTimeout = null;
        }, 2000);
    });
};

const initSfDumps = () => {
    items.value.forEach((item) => {
        if (
            item.dump?.dump &&
            typeof item.dump.dump === 'string' &&
            item.dump.variable_type !== 'string' &&
            item.sf_dump_id
        ) {
            const el = document.getElementById(`sf-dump-${item.sf_dump_id}`);
            if (el && !el.hasAttribute('has-dump-js')) {
                el.setAttribute('has-dump-js', 'true');
                window.Sfdump(`sf-dump-${item.sf_dump_id}`);
            }
        }
    });
};

const reportHeight = () => {
    if (root.value) {
        window.ipcRenderer.send('notification:resize', root.value.scrollHeight);
    }
};

const onItems = async (_event: any, payloads: Payload[]) => {
    items.value = payloads ?? [];

    await nextTick();
    initSfDumps();
    reportHeight();
};

const openMain = () => {
    window.ipcRenderer.send('notification:open-main');
};

const close = () => {
    items.value = [];
    window.ipcRenderer.send('notification:close');
};

onMounted(() => {
    window.ipcRenderer.on('notification:items', onItems);
    window.ipcRenderer.send('notification:ready');
});

onBeforeUnmount(() => {
    window.ipcRenderer.removeListener?.('notification:items', onItems);
    if (copiedTimeout) {
        clearTimeout(copiedTimeout);
    }
});
</script>

<template>
    <div
        ref="root"
        class="flex flex-col text-base-content select-none"
    >
        <div class="flex items-center justify-between px-3 py-2 border-b border-base-content/10">
            <span class="text-xs font-semibold uppercase tracking-wide opacity-70">LaraDumps</span>
            <button
                class="btn btn-ghost btn-xs btn-square"
                aria-label="Close"
                @click="close"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    class="w-4 h-4"
                >
                    <path
                        d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"
                    />
                </svg>
            </button>
        </div>

        <div class="flex flex-col divide-y divide-base-content/10">
            <div
                v-for="(item, index) in items"
                :key="itemKey(item, index)"
                class="px-3 py-2 text-sm cursor-pointer hover:bg-base-content/5 sf-dump-inline"
                @click="openMain"
            >
                <DumpDump :payload="item">
                    <template #label>
                        <button
                            class="shrink-0 p-0.5 rounded cursor-pointer hover:bg-base-content/10 transition-colors"
                            aria-label="Copy"
                            @click.stop="copyValue(item, index)"
                        >
                            <CheckIcon
                                v-if="copiedKey === itemKey(item, index)"
                                class="w-3.5 h-3.5 text-success"
                            />
                            <Square2StackIcon
                                v-else
                                class="w-3.5 h-3.5 opacity-60 -scale-x-100 -scale-y-100 rotate-90"
                            />
                        </button>
                    </template>
                </DumpDump>
            </div>
        </div>
    </div>
</template>
