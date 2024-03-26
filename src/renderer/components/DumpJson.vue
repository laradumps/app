<script setup lang="ts">
import VueJsonPretty from "vue-json-pretty";
import { computed, defineProps, onMounted } from "vue";
import { Payload } from "@/types/Payload";

const props = defineProps<{
    payload: Payload;
}>();

const value = computed(() => {
    if (typeof props.payload.json?.string == "object") {
        return props.payload.json?.string;
    }

    return JSON.parse(props.payload.json?.string ?? "");
});
</script>

<style>
.vjs-tree-node:hover {
    background-color: transparent !important;
}
</style>

<template>
    <div class="text-base-content">
        <VueJsonPretty
            :show-icon="true"
            :show-lenght="true"
            :show-line="false"
            :data="value"
        />
    </div>
</template>
