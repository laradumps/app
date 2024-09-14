<script setup lang="ts">
import { defineProps, onUpdated, nextTick, computed } from "vue";
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

    return props.dumpsBag.sort(sort());
});
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
            class="p-1 px-3"
            v-if="screen === 'Queries'"
        >
            <HeaderQueryRequests
                :payload="dumpsBag"
                :total="dumpsBagFiltered.length"
                :total-filtered="dumpsBagFiltered.filter((payload: Payload) => payload.request_id === timeStore.selected).length"
            />
        </div>

        <div
            class="flex flex-col overflow-auto h-[calc(100vh-1rem)]"
            :class="{ 'flex border-t border-base-content/20 mt-2': screen === 'Queries' }"
        >
            <div id="top"></div>

            <div
                class="w-full mt-1"
                :class="{
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
