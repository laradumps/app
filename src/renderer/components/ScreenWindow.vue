<script setup lang="ts">
import { defineProps, onUpdated, nextTick, computed, watch } from "vue";
import DumpItem from "@/components/DumpItem.vue";
import { Payload } from "@/types/Payload";
import HeaderQueryRequests from "@/components/HeaderQueryRequests.vue";
import { useTimeStore } from "@/store/time";
import NavBarAlwaysOnTop from "@/components/NavBarAlwaysOnTop.vue";
import { useSettingsStore } from "@/store/settings";

const settingsStore = useSettingsStore();
const timeStore = useTimeStore();

const props = defineProps<{
    dumpsItems: Object;
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

    props.dumpsItems.map((dump) => {
        if (dump.type === "queries") {
            const { time, uri, method } = dump.queries;
            timeStore.increment(dump.request_id, dump.id, time, uri, method);
        }

        return dump;
    });

    return props.dumpsItems.sort(sort());
});

const duplicatedQueriesCount = computed(() => {
    return dumpsBagFiltered.value.filter((payload: Payload) => payload.request_id === timeStore.selected && payload.queries.duplicated).length;
});

watch(timeStore.groups, () => {
    if (props.screen === "queries") {
        setTimeout(() => {
            const lastRequest = Object.values(timeStore.requests)[Object.values(timeStore.requests).length - 1];

            timeStore.selected = lastRequest.requestId;
        }, 600);
    }
});
</script>

<template>
    <div class="flex flex-col">
        <div id="top"></div>

        <div v-if="screen === 'queries'">
            <HeaderQueryRequests
                :payload="dumpsItems"
                :total="dumpsBagFiltered.length"
                :total-duplicated-filtered="duplicatedQueriesCount"
                :total-filtered="dumpsBagFiltered.filter((payload: Payload) => payload.request_id === timeStore.selected).length"
            />
        </div>

        <div
            class="flex mt-2 flex-col overflow-auto h-[calc(100vh-1rem)]"
            :class="{ 'flex mt-3': screen === 'queries' }"
        >
            <div id="top"></div>

            <div
                class="w-full mt-1 mb-[40px]"
                :class="{
                    'mt-[7.6rem]': screen == 'queries',
                    'flex flex-col-reverse': settingsStore.settings.dump_order === 'reversed' && screen !== 'queries'
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
                        v-show="screen === 'queries' ? payload.request_id === timeStore.selected : screen !== 'livewire'"
                    />
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.nav-bar {
    height: auto !important;
}
</style>
