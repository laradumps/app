<script setup lang="ts">
import { defineProps, onMounted } from "vue";

import { Payload } from "@/types/Payload";
import CodeSnippet from "@/components/CodeSnippet.vue";

const props = defineProps<{
    payload: Payload;
}>();

onMounted(() => {
    if (typeof props.payload.code_snippet == "undefined") {
        const { context } = props.payload.log_application;

        window.Sfdump(`sf-dump-${context[1]}`);
    }
});
</script>

<template>
    <div
        id="log"
        class="space-y-2"
    >
        <article class="prose my-3 mb-6">
            <h4 class="text-sm">{{ props.payload.log_application?.message }}</h4>
        </article>

        <div
            v-if="typeof props.payload.code_snippet == 'undefined'"
            v-html="props.payload.log_application?.context[0]"
        ></div>

        <CodeSnippet
            v-else
            :payload="payload"
        />
    </div>
</template>
