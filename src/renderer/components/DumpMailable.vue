<script setup lang="ts">
import { defineProps } from "vue";
import { Payload } from "@/types/Payload";

const props = defineProps<{
    payload: Payload;
}>();
</script>

<template>
    <div class="text-base-content">
        <div v-html="props.payload.mailable.html"></div>
    </div>
</template>
