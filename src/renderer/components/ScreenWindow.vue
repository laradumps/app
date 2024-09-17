<script setup lang="ts">
import { defineProps, onUpdated, nextTick, computed, watch, ref, reactive, onMounted } from "vue";
import DumpItem from "@/components/DumpItem.vue";
import { Payload } from "@/types/Payload";
import HeaderQueryRequests from "@/components/HeaderQueryRequests.vue";
import { useReorder } from "@/store/reorder";
import { useTimeStore } from "@/store/time";
import NavBarAlwaysOnTop from "@/components/NavBarAlwaysOnTop.vue";

const reorderStore = useReorder();
const timeStore = useTimeStore();

const props = defineProps<{
    dumpsBag: Object;
    screen: String;
}>();

onUpdated(async () => {
    await nextTick();

    document.getElementById("top").scrollIntoView({
        behavior: "smooth"
    });
});

/**
 * Filters and sorts payloads based on search criteria and color filtering.
 * @returns {Array} An array of filtered and sorted payloads.
 */
const dumpsBagFiltered = computed(() => {
    /**
     * Helper function to sort payloads in reverse time order.
     * @param {boolean} reversed - Indicates whether the sorting order is reversed.
     * @returns {Function} A comparison function for sorting payloads.
     */
    const reverseTimeOrder = (reversed: boolean) => {
        return function () {
            reversed = !reversed;
            return function (a, b) {
                const aTime = a?.queries?.time;
                const bTime = b?.queries?.time;
                return (aTime === bTime ? 0 : aTime < bTime ? -1 : 1) * (reversed ? -1 : 1);
            };
        };
    };

    const sort = reverseTimeOrder(timeStore.order);

    props.dumpsBag.map((dump) => {
        if (dump.type === "queries") {
            const { time } = dump.queries;
            timeStore.increment(dump.request_id, dump.id, time);
        }

        return dump;
    })

    return props.dumpsBag.sort(sort());
});

const duplicatedQueriesCount = computed(() => {
    return dumpsBagFiltered.value.filter((payload: Payload) => payload.request_id === timeStore.selected && payload.queries.duplicated).length;
});

watch(timeStore.groups, () => {
    if (props.screen === "Queries") {
        setTimeout(() => {
            const lastRequest = Object.values(timeStore.requests)[Object.values(timeStore.requests).length - 1];

            timeStore.selected = lastRequest.requestId

            console.log({
                last: lastRequest.requestId,
                selected: timeStore.selected
            })
        }, 600);
    }
})
</script>

<template>
    <div class="flex flex-col">
        <div id="top"></div>

        <div class="flex justify-end items-center bg-base text-center z-100">
            <!-- always on top -->
            <NavBarAlwaysOnTop
                window="screen-window"
                class="mt-1 mr-1"
            />
        </div>

        <div
            class="py-1 px-3"
            v-if="screen === 'Queries'"
        >
            <HeaderQueryRequests
                :payload="dumpsBag"
                :total="dumpsBagFiltered.length"
                :total-duplicated-filtered="duplicatedQueriesCount"
                :total-filtered="dumpsBagFiltered.filter((payload: Payload) => payload.request_id === timeStore.selected).length"
            />
        </div>

        <div
            class="flex flex-col overflow-auto h-[calc(100vh-1rem)]"
            :class="{ flex: screen === 'Queries' }"
        >
            <div id="top"></div>

            <div
                class="w-full mt-1"
                :class="{
                    'mt-12' : screen == 'Queries',
                    'flex flex-col-reverse': reorderStore.reverse && screen !== 'Queries'
                }"
            >
                <div
                    class="w-full"
                    :id="payload.id"
                    v-for="(payload, index) in dumpsBagFiltered"
                    :key="payload.sf_dump_id"
                >
                    <DumpItem
                        :index="index"
                        :payload="payload"
                        v-show="screen === 'Queries' ? payload.request_id === timeStore.selected : screen !== 'Livewire'"
                    />
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped></style>
