<script setup lang="ts">
import { nextTick, onMounted, onBeforeUnmount, ref } from 'vue';
import { Payload } from '@/types/Payload';
import DumpDump from '@/components/dumps/DumpDump.vue';

const items = ref<Payload[]>([]);
const root = ref<HTMLElement | null>(null);

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
                :key="`${item.sf_dump_id ?? index}-${index}`"
                class="px-3 py-2 text-sm cursor-pointer hover:bg-base-content/5 sf-dump-inline"
                @click="openMain"
            >
                <DumpDump :payload="item" />
            </div>
        </div>
    </div>
</template>
