<script setup lang="ts">
import { Payload } from "@/types/Payload";
import QueriesHeader from "@/components/laravel/QueriesHeader.vue";
import { computed, defineProps, nextTick, onMounted, ref } from "vue";
import { useQueriesPayloadStore } from "@/store/queries";
import { useTimeStore } from "@/store/time";
import DumpItem from "@/components/dumps/DumpItem.vue";
import { useQueryDuplicated } from "@/store/query-duplicated";
import { useQueriesOriginFilter } from "@/store/queries-origin-filter";
import { useQueriesBlockedStore } from "@/store/queries-blocked";
import { MagnifyingGlassIcon, TrashIcon, PlayIcon, LockOpenIcon } from "@heroicons/vue/24/outline";
import tippy from "tippy.js";
import { usePendingRequestsStore } from "@/store/pending-requests";
import { Pane, Splitpanes } from "splitpanes";
import "splitpanes/dist/splitpanes.css";
import QueriesRequests from "@/components/laravel/QueriesRequests.vue";
import IconPause from "@/components/Icons/IconPause.vue";
import { usePauseQueriesStore } from "@/store/pause-queries";
import SvgEmpty from "@/components/svg/SvgEmpty.vue";

const queriesStore = useQueriesPayloadStore();
const timeStore = useTimeStore();
const queriesOriginFilter = useQueriesOriginFilter();
const blockedQueriesStore = useQueriesBlockedStore();
const queryDuplicatedStore = useQueryDuplicated();
const pendingRequestsStore = usePendingRequestsStore();
const pauseQueries = usePauseQueriesStore();

const search = ref("");

const props = defineProps<{
    items: [];
    inScreenWindow: boolean;
}>();

const queries = computed(() => {
    const items = props.items ? props.items : queriesStore.payload;

    const reverseTimeOrder = (order: string) => {
        if (order === "default") {
            return undefined;
        }

        const isReversed = order !== "asc";
        return (a: Payload, b: Payload) => {
            const aTime = a?.queries?.query.time || 0;
            const bTime = b?.queries?.query.time || 0;
            return (aTime - bTime) * (isReversed ? -1 : 1);
        };
    };

    const sort = reverseTimeOrder(timeStore.order);
    const queryDuplicatedStore = useQueryDuplicated();

    items.forEach((dump: Payload) => {
        const sql = dump.queries?.query?.sql || "";

        const isDuplicate = items.filter((d: Payload) => d.request_id === dump.request_id && d.queries.query?.sql === sql);

        queryDuplicatedStore.add(dump.request_id, sql, isDuplicate.length > 1, isDuplicate.length);
    });

    return items
        .filter((dump: Payload) => {
            if (queryDuplicatedStore.showOnlyDuplicated) {
                return queryDuplicatedStore.isDuplicated(dump.request_id, dump.queries?.query?.sql);
            }
            return true;
        })
        .filter(
            (payload: Payload) =>
                JSON.stringify(payload[payload.type] ?? "")
                    .toLowerCase()
                    .includes(search.value.toLowerCase()) || payload.label?.toLowerCase().includes(search.value.toLowerCase())
        )
        .filter((dump: Payload) => {
            if (dump.type === "queries" && dump.queries?.origin) {
                return queriesOriginFilter.origin.includes(dump.queries?.origin);
            }
        })
        .sort(sort);
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

        <div class="flex items-center gap-1 justify-between mt-1 mb-2">
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
            <button
                @click="pauseQueries.toggle()"
                class="btn btn-sm p-[0.5rem]"
                :data-tippy-content="$t('pause')"
            >
                <PlayIcon
                    v-if="pauseQueries.is_paused"
                    class="w-4 text-warning"
                />
                <IconPause
                    v-else
                    class="w-4"
                />
            </button>

            <button
                @click="clear()"
                class="btn btn-sm p-[0.5rem]"
                data-tippy-content="Clear"
            >
                <TrashIcon class="w-4" />
            </button>
        </div>

        <Splitpanes
            v-if="queriesStore.payload.length > 0"
            vertical
        >
            <pane
                size="28"
                class="text-sm mt-1"
            >
                <div class="overflow-auto h-[calc(100vh-155px)]">
                    <QueriesRequests />
                </div>
            </pane>

            <pane class="text-sm">
                <div
                    v-if="timeStore.selected"
                    class="pl-2 space-y-1"
                >
                    <QueriesHeader />

                    <div class="overflow-auto h-[calc(100vh-204px)]">
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
            </pane>
        </Splitpanes>

        <div
            v-else
            class="-ml-8 absolute flex items-center justify-center w-full"
            style="height: -webkit-fill-available"
        >
            <SvgEmpty class="w-30 opacity-25" />
            <div class="text-base-content/70">
                <h1 class="text-lg font-semibold mb-2">No Queries</h1>
            </div>
        </div>
    </div>
</template>
<style scoped>
@reference "./../../styles.css";

::v-deep(.splitpanes__splitter) {
    @apply opacity-0 hover:opacity-100 min-w-[0.2rem] bg-neutral/10 rounded-box hover:bg-secondary/60;
}
</style>
