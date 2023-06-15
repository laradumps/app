<template>
    <div class="border border-slate-300 rounded-sm">
        <div v-html="props.payload.mailable.html"></div>
    </div>
</template>

<script setup lang="ts">
import { defineProps } from "vue";
import { Payload } from "@/types/Payload";

const props = defineProps<{
    payload: Payload;
}>();
</script>
