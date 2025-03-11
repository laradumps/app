<script setup lang="ts">
import { Payload } from "@/types/Payload";
import HeaderQueryRequests from "@/components/HeaderQueryRequests.vue";
import { computed, defineProps, ref } from "vue";
import { useQueriesPayloadStore } from "@/store/queries";
import { useTimeStore } from "@/store/time";
import DumpItem from "@/components/DumpItem.vue";
import { useQueryDuplicated } from "@/store/query-duplicated";
import { useQueriesOriginFilter } from "@/store/queries-origin-filter";
import { TrashIcon } from "@heroicons/vue/24/outline";

const queriesStore = useQueriesPayloadStore();
const timeStore = useTimeStore();
const queriesOriginFilter = useQueriesOriginFilter();

const search = ref("");

const props = defineProps<{
    items: [];
    inScreenWindow: boolean;
}>();

const queries = computed(() => {
    const items = props.items ? props.items : queriesStore.payload;

    const reverseTimeOrder = (order: string) => {
        let reversed: boolean;
        if (order === "default") {
            return function () {};
        }

        reversed = order !== "asc";
        return function () {
            reversed = !reversed;
            return function (a: Payload, b: Payload) {
                const aTime = a?.queries?.time || 0;
                const bTime = b?.queries?.time || 0;
                return (aTime === bTime ? 0 : aTime < bTime ? -1 : 1) * (reversed ? -1 : 1);
            };
        };
    };

    const sort = reverseTimeOrder(timeStore.order);
    const queryDuplicatedStore = useQueryDuplicated();

    items
        .filter((dump: Payload) => dump.type === "queries")
        .forEach((dump: Payload) => {
            const sql = dump.queries?.sql || "";

            const isDuplicate = items.filter((d: Payload) => d.type === "queries" && d.request_id === dump.request_id && d.queries.sql === sql);

            queryDuplicatedStore.add(dump.request_id, sql, isDuplicate.length > 1, isDuplicate.length);
        });

    return items
        .filter(
            (dump: Payload) =>
                JSON.stringify(dump[dump.type] ?? "")
                    .toLowerCase()
                    .includes(search.value.toLowerCase()) || dump.label?.toLowerCase().includes(search.value.toLowerCase())
        )
        .filter((dump: Payload) => {
            if (dump.type === "queries" && dump.queries?.origin) {
                return queriesOriginFilter.origin.includes(dump.queries?.origin);
            }
        })
        .sort(sort());
});

const clear = () => {
    timeStore.clear();
    queriesStore.clear();
};
</script>

<template>
    <div class="px-3">
        <div class="flex items-center gap-2 justify-between mt-1 mb-2">
            <input
                v-model="search"
                type="text"
                class="w-full input input-sm"
                :placeholder="$t('search')"
            />
            <button
                @click="clear()"
                class="btn btn-soft btn-sm"
            >
                <TrashIcon class="w-4" />
                <span class="text-xs">{{ $t("clear") }}</span>
            </button>
        </div>

        <HeaderQueryRequests
            v-if="queriesStore.payload.length > 0"
            :total="queriesStore.payload.length"
            :total-filtered="queriesStore.payload.filter((payload: Payload) => payload.request_id === timeStore.selected).length"
        />

        <div class="overflow-auto mt-3 h-[calc(100vh-225px)]">
            <div class="overflow-auto">
                <div
                    v-for="(payload, index) in queries"
                    :key="payload.sf_dump_id"
                    :id="payload.id"
                    class="w-full"
                >
                    <DumpItem
                        class="w-full group text-sm mb-2.5"
                        v-show="payload.request_id === timeStore.selected"
                        :payload="payload"
                    />
                </div>
            </div>
        </div>
    </div>
</template>
<style scoped>
.collapse-content {
    padding-bottom: 0;
}
</style>
