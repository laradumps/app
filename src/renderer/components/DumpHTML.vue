<script setup lang="ts">
import { defineProps } from "vue";
import { Payload } from "@/types/Payload";

const props = defineProps<{
    payload: Payload;
}>();
</script>

<template>
    <div class="bg-base-100 space-y-2 rounded-sm px-2 p-1">
        <div v-html="props.payload.html"></div>
    </div>
</template>
