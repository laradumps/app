<script setup lang="ts">
import { computed } from 'vue';
import { Payload } from '@/types/Payload';
import { useTimeStore } from '@/store/time';
import { useQueriesPayloadStore } from '@/store/queries';
import { BoltIcon, ExclamationTriangleIcon } from '@heroicons/vue/20/solid';
import { useQueryDuplicated } from '@/store/query-duplicated';
import { httpMethodColor, formatDuration } from './profile/profileHelpers';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const timeStore = useTimeStore();
const queriesStore = useQueriesPayloadStore();
const duplicatesStore = useQueryDuplicated();

const allRequests = computed(() => {
    let requests = timeStore.groups.map((requestId: string, index: number) => ({
        index: index + 1,
        id: requestId,
        label: timeStore.getUri(requestId),
        time: timeStore.getTotal(requestId),
        method: timeStore.getMethod(requestId),
        origin: timeStore.getOrigin(requestId),
        count: queriesStore.payload.filter((payload: Payload) => payload.request_id == requestId).length,
        date: timeStore.getDate(requestId)
    }));

    if (timeStore.search?.trim()) {
        const searchLower = timeStore.search.toLowerCase();
        requests = requests.filter(
            (req) =>
                req.label?.toLowerCase().includes(searchLower) ||
                req.method?.toLowerCase().includes(searchLower) ||
                String(req.count).includes(searchLower) ||
                req.time.toString().includes(searchLower)
        );
    }

    requests.sort((a: any, b: any) => b.index - a.index);

    return requests;
});

const display = (id: string) => {
    duplicatesStore.showOnlyDuplicated = false;
    timeStore.setSelectedRequest(id);
};
</script>

<template>
    <div class="flex flex-col h-full">
        <div class="p-2 overflow-auto flex flex-col gap-1">
            <button
                v-for="request in allRequests"
                :key="request.id"
                type="button"
                @click="display(request.id)"
                class="w-full text-left flex items-center gap-3 px-2.5 py-2 rounded-lg border transition-colors"
                :class="
                    request.id === timeStore.selected
                        ? 'border-primary/40 bg-primary/10'
                        : 'border-transparent hover:bg-base-200'
                "
            >
                <span
                    class="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded flex-shrink-0 w-14 text-center"
                    :class="httpMethodColor(request.method || 'GET')"
                >
                    {{ request.method || 'GET' }}
                </span>

                <span class="flex-1 min-w-0">
                    <span
                        class="block text-xs font-medium truncate"
                        v-html="request.label ? request.label : 'Tinker'"
                    >
                    </span>
                    <span class="block text-[10px] text-base-content/40 mt-0.5">
                        {{ dayjs(request.date).fromNow() }}
                    </span>
                </span>

                <div class="flex items-center gap-2 flex-shrink-0">
                    <div class="flex gap-1">
                        <BoltIcon
                            class="w-3.5"
                            :class="{
                                'text-warning': queriesStore.hasExplainNodes(request.id),
                                'text-base-content/10': !queriesStore.hasExplainNodes(request.id)
                            }"
                        />
                        <ExclamationTriangleIcon
                            class="w-3.5"
                            :class="{
                                'text-error': duplicatesStore.requestsWithDuplicates.has(request.id),
                                'text-base-content/10': !duplicatesStore.requestsWithDuplicates.has(request.id)
                            }"
                        />
                    </div>
                    <span
                        class="badge badge-ghost badge-sm font-mono text-[10px] gap-1"
                        :class="{ 'badge-warning': request.time >= 100 }"
                    >
                        <span class="opacity-50 font-sans">{{ request.count }}q</span>
                        <span>{{ formatDuration(request.time) }}</span>
                    </span>
                </div>
            </button>

            <div
                v-if="allRequests.length === 0"
                class="text-center text-xs text-base-content/40 py-6"
            >
                {{ $t('no_records_found') }}
            </div>
        </div>
    </div>
</template>

<style scoped></style>
