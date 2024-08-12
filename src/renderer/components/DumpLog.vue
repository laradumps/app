<script setup lang="ts">
import { defineProps, onMounted } from "vue";
import { Payload } from "@/types/Payload";

const props = defineProps<{
    payload: Payload;
}>();

onMounted(() => {
    const { context } = props.payload.log_application;

    window.Sfdump(`sf-dump-${context[1]}`);
});
</script>

<template>
    <div
        id="log"
        class="space-y-3"
    >
        <div class="text-base-content font-sans font-normal text-sm tracking-wide rounded-t-sm">
            {{ props.payload.log_application.message }}
        </div>

        <div v-html="props.payload.log_application?.context[0]"></div>
    </div>
</template>
