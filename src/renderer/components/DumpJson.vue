<template>
    <div class="bg-slate-100 dark:bg-slate-800 rounded-sm px-2 p-1 py-2">
        <VueJsonPretty
            :show-icon="true"
            :show-lenght="true"
            :show-line-number="true"
            :data="value"
        />
    </div>
</template>

<script setup lang="ts">
import VueJsonPretty from "vue-json-pretty";
import { computed, defineProps, onMounted } from "vue";
import { Payload } from "@/types/Payload";

const props = defineProps<{
    payload: Payload;
}>();

const value = computed(() => JSON.parse(props.payload.json?.string ?? ""));
</script>
