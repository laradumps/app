<script setup lang="ts">
import { Payload } from "@/types/Payload";
import HeaderQueryRequests from "@/components/HeaderQueryRequests.vue";
import { computed, defineProps, onMounted, ref, watch } from "vue";
import { useQueriesPayloadStore } from "@/store/queries";
import { useTimeStore } from "@/store/time";
import DumpItem from "@/components/DumpItem.vue";
import { useQueryDuplicated } from "@/store/query-duplicated";
import { useQueriesOriginFilter } from "@/store/queries-origin-filter";
import { useQueriesBlockedStore } from "@/store/queries-blocked";
import { AdjustmentsHorizontalIcon, MagnifyingGlassIcon, TrashIcon, LockClosedIcon, LockOpenIcon } from "@heroicons/vue/20/solid";
import tippy from "tippy.js";
import { usePendingRequestsStore } from "@/store/pending-requests";

const queriesStore = useQueriesPayloadStore();
const timeStore = useTimeStore();
const queriesOriginFilter = useQueriesOriginFilter();
const blockedQueriesStore = useQueriesBlockedStore();
const queryDuplicatedStore = useQueryDuplicated();
const pendingRequestsStore = usePendingRequestsStore();

const search = ref("");
const orderBy = ref("default");

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

const showBlockedQueries = () => {
    blocked_queries.showModal();
};

watch(orderBy, (value) => {
    timeStore.setOrder(value);
});

const options = ["http", "console"];

const toggle = (value) => {
    queriesOriginFilter.toggleFilter(value);
};

onMounted(() => {
    tippy("[data-tippy-content]", { allowHTML: true, theme: "light-border", placement: "right-end" });
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
            <div class="flex gap-2">
                <div class="dropdown dropdown-end">
                    <div
                        tabindex="0"
                        role="button"
                        class="btn btn-soft btn-sm"
                    >
                        <AdjustmentsHorizontalIcon class="w-4.5 text-primary" />
                    </div>
                    <ul
                        tabindex="0"
                        class="dropdown-content menu !text-sm bg-base-300 rounded-box z-1 w-52 p-4 shadow-sm"
                    >
                        <li class="text-xs uppercase font-normal mb-1">Order by:</li>
                        <li>
                            <label>
                                <input
                                    v-model="orderBy"
                                    type="radio"
                                    name="radio-order"
                                    class="radio radio-sm"
                                    value="default"
                                />
                                default
                            </label>
                        </li>
                        <li>
                            <label>
                                <input
                                    v-model="orderBy"
                                    type="radio"
                                    name="radio-order"
                                    class="radio radio-sm"
                                    value="desc"
                                />
                                desc
                            </label>
                        </li>
                        <li>
                            <label>
                                <input
                                    v-model="orderBy"
                                    type="radio"
                                    name="radio-order"
                                    class="radio radio-sm"
                                    value="asc"
                                />
                                asc
                            </label>
                        </li>
                        <li class="text-xs uppercase font-normal my-3">origin:</li>
                        <li
                            v-for="option in options"
                            :key="option"
                        >
                            <label>
                                <input
                                    type="checkbox"
                                    :value="option"
                                    :checked="queriesOriginFilter.origin.includes(option)"
                                    @change="toggle(option)"
                                    class="checkbox checkbox-sm"
                                />
                                {{ option.charAt(0).toUpperCase() + option.slice(1) }}
                            </label>
                        </li>
                    </ul>
                </div>
                <button
                    @click="showBlockedQueries"
                    class="btn btn-soft btn-sm"
                    data-tippy-content="Blocked Queries"
                >
                    <LockClosedIcon class="text-warning size-4 hover:opacity-75" />
                    <span
                        class="text-xs font-normal opacity-70"
                        v-if="blockedQueriesStore.blocked.length > 0"
                    >
                        ({{ blockedQueriesStore.blocked.length }})
                    </span>
                </button>
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
