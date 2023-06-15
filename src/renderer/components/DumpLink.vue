<template>
    <a
        :href="href"
        :title="title"
        class="flex items-center group"
    >
        <IconInternalLink class="w-3 h-3 mr-2 inline-flex text-slate-500 dark:text-slate-400" />

        <div class="font-light break-all text-xs text-slate-800 hover:text-blue-400 dark:text-slate-400 dark:hover:text-blue-400 cursor-pointer">
            <span>{{ value }}</span>
        </div>
    </a>
</template>

<script setup lang="ts">
import IconInternalLink from "@/components/Icons/IconInternalLink.vue";
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
