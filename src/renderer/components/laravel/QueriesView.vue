<script setup lang="ts">
import { Payload } from "@/types/Payload";
import HeaderQueryRequests from "@/components/HeaderQueryRequests.vue";
import { computed, defineProps, nextTick, onMounted, ref } from "vue";
import { useQueriesPayloadStore } from "@/store/queries";
import { useTimeStore } from "@/store/time";
import DumpItem from "@/components/DumpItem.vue";
import { useQueryDuplicated } from "@/store/query-duplicated";
import { useQueriesOriginFilter } from "@/store/queries-origin-filter";
import { useQueriesBlockedStore } from "@/store/queries-blocked";
import { MagnifyingGlassIcon, TrashIcon, LockOpenIcon } from "@heroicons/vue/20/solid";
import tippy from "tippy.js";
import { usePendingRequestsStore } from "@/store/pending-requests";

const queriesStore = useQueriesPayloadStore();
const timeStore = useTimeStore();
const queriesOriginFilter = useQueriesOriginFilter();
const blockedQueriesStore = useQueriesBlockedStore();
const queryDuplicatedStore = useQueryDuplicated();
const pendingRequestsStore = usePendingRequestsStore();

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
    queriesOriginFilter.clear();
    blockedQueriesStore.clear();
    queryDuplicatedStore.clear();

    pendingRequestsStore.clear("queries");
};

onMounted(() => {
    nextTick(() => {
        tippy("[data-tippy-content]", {
            allowHTML: true,
            theme: "light-border",
            placement: "bottom"
        });
    });
});
</script>

<template>
    <div class="px-3">
        <dialog
            id="blocked_queries"
            class="modal modal-middle"
        >
            <div class="modal-box w-11/12 max-w-5xl">
                <h3 class="font-bold text-lg">Blocked</h3>
                <div class="overflow-auto mt-3 h-[calc(100vh-240px)]">
                    <table class="table table-zebra w-full">
                        <thead>
                            <tr>
                                <th>sql</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr
                                v-for="(sql, index) in blockedQueriesStore.blocked"
                                :key="index"
                            >
                                <td>
                                    <span
                                        :title="sql"
                                        class="line-clamp-4"
                                        >{{ sql }}</span
                                    >
                                </td>
                                <td>
                                    <button
                                        @click="blockedQueriesStore.unblock(sql)"
                                        class="btn btn-primary btn-sm"
                                    >
                                        <LockOpenIcon class="w-4" />
                                        {{ $t("unblock") }}
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            <form
                method="dialog"
                class="modal-backdrop"
            >
                <button>close</button>
            </form>
        </dialog>

        <div class="flex items-center gap-2 justify-between mt-1 mb-2">
            <div class="flex gap-2 w-full">
                <label class="input w-full input-sm">
                    <MagnifyingGlassIcon class="size-4" />
                    <input
                        v-model="search"
                        type="search"
                        class="grow"
                        :placeholder="$t('search')"
                    />
                </label>
            </div>
            <div>
                <button
                    @click="clear()"
                    class="btn btn-soft btn-sm"
                    data-tippy-content="Clear"
                >
                    <TrashIcon class="w-4 text-error" />
                </button>
            </div>
        </div>

        <HeaderQueryRequests
            v-if="queriesStore.payload.length > 0"
            :total="queriesStore.payload.length"
            :total-filtered="queriesStore.payload.filter((payload: Payload) => payload.request_id === timeStore.selected).length"
        />

        <div class="overflow-auto mt-3 h-[calc(100vh-240px)]">
            <div class="overflow-auto">
                <div
                    v-for="(payload, index) in queries"
                    :key="payload.sf_dump_id"
                    :id="payload.id"
                    class="w-full"
                >
                    <DumpItem
                        class="w-full group text-sm mb-3"
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
