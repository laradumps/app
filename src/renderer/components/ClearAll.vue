<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useTimeStore } from "@/store/time";
import { useColorStore } from "@/store/colors";
import { useGlobalSearchStore } from "@/store/global-search";
import { usePayloadStore } from "@/store/payload";
import { TrashIcon } from "@heroicons/vue/24/outline";
import { useQueriesPayloadStore } from "@/store/queries";
import { useMailStore } from "@/store/mail";
import { useJobStore } from "@/store/jobs";
import { useLogStore } from "@/store/logs";
import { usePendingRequestsStore } from "@/store/pending-requests";
import { useQueryDuplicated } from "@/store/query-duplicated";
import { useScreenStore } from "@/store/screen";

const timeStore = useTimeStore();
const colorStore = useColorStore();
const globalSearchStore = useGlobalSearchStore();
const payloadStore = usePayloadStore();
const logStore = useLogStore();
const jobStore = useJobStore();
const queryStore = useQueriesPayloadStore();
const mailStore = useMailStore();
const pendingRequestsStore = usePendingRequestsStore();
const duplicatesStore = useQueryDuplicated();
const screenStore = useScreenStore();

const clearAll = (): void => {
    // store
    payloadStore.clearAll();
    timeStore.clear();
    globalSearchStore.clear();
    colorStore.clear();
    logStore.clear();
    jobStore.clear();
    mailStore.clear();
    queryStore.clear();
    duplicatesStore.clear();
    screenStore.clearAll();

    pendingRequestsStore.clear("queries");

    setTimeout(() => {
        screenStore.add({
            screen_name: "home",
            raise_in: 0,
            visible: true,
            pinned: false,
            new_window: false
        });
        window.ipcRenderer.send("storage.get");
    }, 10);

    window.ipcRenderer.send("badge-icon.increment", {
        reset: true
    });
};

const hasPayload = computed(() => {
    return payloadStore.payload.length > 0 || Object(logStore.logs).length > 0 || Object(jobStore.jobs).length > 0 || Object(mailStore.mails).length > 0 || Object(queryStore.payload).length > 0;
});

onMounted(() => {
    window.ipcRenderer.on("clear", () => clearAll());
    window.ipcRenderer.on("app:local-shortcut-execute::clear_all", () => clearAll());
});
</script>

<template>
    <div>
        <button
            v-show="hasPayload"
            :title="$t('clear')"
            class="p-2 flex hover:bg-base-200 rounded-md"
            @click="clearAll"
        >
            <TrashIcon class="size-4" />
        </button>
    </div>
</template>

<style scoped></style>
