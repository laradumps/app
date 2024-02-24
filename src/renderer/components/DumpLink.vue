<template>
    <a
        :href="href"
        :title="title"
        class="flex items-center group"
    >
        <div class="break-all tracking-wider hover:opacity-75 cursor-pointer">
            <span>{{ value }}</span>
        </div>
    </a>
</template>

<script setup lang="ts">
import { defineProps } from "vue";

defineProps({
    href: {
        type: String,
        default: null,
        required: true
    },
    value: {
        type: String,
        default: null,
        required: true
    },
    title: {
        type: String,
        default: null
    }
});
</script>
