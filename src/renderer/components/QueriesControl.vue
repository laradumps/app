<script setup lang="ts">
import { computed, nextTick, onUpdated, ref } from "vue";
import { useTimeStore } from "@/store/time";

const timeStore = useTimeStore();

const allRequests = computed(() => {
    let requests = timeStore.groups.map((group, index) => ({
        index: index + 1,
        id: group,
        label:   timeStore.getTime(group) + " - " + timeStore.getTotal(group).toFixed(2) + " ms"
    }));

    requests.sort((a, b) => b.index - a.index);

    return requests;
});

const selected = ref();
const updating = ref(false);

const select = (item) => {
    updating.value = true
    selected.value = item.id
    timeStore.setSelectedRequest(item.id)
    nextTick(() => updating.value = false)
}

onUpdated(() => {
    if (!updating.value) {
        selected.value = allRequests.value[0]?.id ?? null
    }
})

</script>

<template>
    <div>
        <ul class="menu p-0 text-xs bg-base-200 w-[10rem]">
            <li v-for="(item, index) in allRequests"
                class="p-1 rounded-[0.375rem] text-[10px]"
                :class="{ 'font-semibold text-primary' : item.id === selected}"
                @click="select(item)"
                 :key="index"><a v-text="item.label"></a>
            </li>
        </ul>
    </div>
</template>

<style scoped>

</style>
