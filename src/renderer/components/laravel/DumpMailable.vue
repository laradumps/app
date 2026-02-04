<script setup lang="ts">
import { defineProps } from 'vue';
import { Payload } from '@/types/Payload';

defineProps<{
    payload: Payload;
}>();
</script>

<template>
    <div
        v-if="payload.mailable"
        class="text-base-content"
    >
        <div v-html="payload.mailable.html"></div>
    </div>
</template>
