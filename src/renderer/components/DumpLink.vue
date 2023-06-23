<template>
    <a
        :href="href"
        :title="title"
        class="flex items-center group"
    >
        <div class="font-light underline break-all text-xs text-slate-800 hover:text-blue-400 dark:text-slate-500 dark:hover:text-blue-400 cursor-pointer">
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
