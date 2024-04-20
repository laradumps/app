<script setup lang="ts">
import { computed, nextTick, onUpdated, ref } from "vue";
import { useTimeStore } from "@/store/time";

const timeStore = useTimeStore();

const allRequests = computed(() => {
    let requests = timeStore.groups.map((group, index) => ({
        index: index + 1,
        id: group,
        hour: timeStore.getTime(group),
        time: timeStore.getTotal(group).toFixed(2)
    }));

    requests.sort((a, b) => b.index - a.index);

    return requests;
});

const selected = ref();
const updating = ref(false);

const select = (item) => {
    updating.value = true;
    selected.value = item.id;
    timeStore.setSelectedRequest(item.id);
    nextTick(() => (updating.value = false));
};

onUpdated(() => {
    if (!updating.value) {
        selected.value = allRequests.value[0]?.id ?? null;
    }
});
</script>

<template>
    <div>
        <ul class="menu overflow-auto block w-52 p-0 [&_li>*]:rounded-none [&_li>*]:py-1 [&_li>*]:px-1">
            <li
                v-for="(item, index) in allRequests"
                class="text-base-content/80 hover:text-base-content"
                :class="{ 'font-semibold bg-base-300/40 !text-primary': item.id === selected }"
                @click="select(item)"
                :key="index"
            >
                <div class="flex justify-between">
                    <a
                        class="!text-xs !leading-6"
                        v-text="item.hour"
                    ></a>
                    <a
                        class="!text-xs !leading-6"
                        v-text="item.time + ' ms'"
                    ></a>
                </div>
            </li>
        </ul>
    </div>
</template>

<style scoped></style>
