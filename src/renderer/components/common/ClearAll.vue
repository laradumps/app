<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import { usePayloadStore } from '@/store/payload';
import { TrashIcon } from '@heroicons/vue/24/outline';
import IconButton from '@/components/common/IconButton.vue';
import { useQueriesPayloadStore } from '@/store/queries';
import { useMailStore } from '@/store/mail';
import { useJobStore } from '@/store/jobs';
import { useLogStore } from '@/store/logs';
import { useLivewireStore } from '@/store/livewire';
import { useBrainStore } from '@/store/brains';
import { useProfileStore } from '@/store/profile';
import { useClearAll } from '@/composables/useClearAll';

const payloadStore = usePayloadStore();
const logStore = useLogStore();
const jobStore = useJobStore();
const queryStore = useQueriesPayloadStore();
const mailStore = useMailStore();
const livewireStore = useLivewireStore();
const brainStore = useBrainStore();
const profileStore = useProfileStore();

const { clear } = useClearAll();

const clearAll = (): void => {
    clear();
};

const hasPayload = computed(() => {
    return (
        livewireStore.requests.length > 0 ||
        payloadStore.payload.length > 0 ||
        Object.values(logStore.logs).length > 0 ||
        logStore.incomingCount > 0 ||
        Object.values(jobStore.jobs).length > 0 ||
        jobStore.incomingCount > 0 ||
        Object.values(mailStore.mails).length > 0 ||
        Object.values(queryStore.payload).length > 0 ||
        Object.values(brainStore.brains).length > 0 ||
        Object.values(profileStore.profiles).length > 0
    );
});

const onClear = () => clearAll();

onMounted(() => {
    window.ipcRenderer.on('clear', onClear);
    window.ipcRenderer.on('app:local-shortcut-execute::clear_all', onClear);
});

onUnmounted(() => {
    window.ipcRenderer.removeListener('clear', onClear);
    window.ipcRenderer.removeListener('app:local-shortcut-execute::clear_all', onClear);
});
</script>

<template>
    <IconButton
        v-show="hasPayload"
        :label="$t('clear')"
        variant="danger"
        @click="clearAll"
    >
        <TrashIcon class="size-4" />
    </IconButton>
</template>
