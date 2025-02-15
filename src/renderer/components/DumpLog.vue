<script setup lang="ts">
import { computed, defineProps, onMounted, ref } from "vue";

import { Payload } from "@/types/Payload";
import CodeSnippet from "@/components/CodeSnippet.vue";

const props = defineProps<{
    payload: Payload;
}>();

const showCompletedMessage = ref(false);

const toggleCompletedMessage = computed(() => {
    showCompletedMessage.value = !showCompletedMessage.value;
});

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
        class="space-y-1"
    >
        <div
            @dblclick="toggleCompletedMessage"
            title="Double click to expand"
            class="prose my-2 mb-8 tracking-wide"
            :class="{
                '!my-2': Object.values(payload.code_snippet || {}).length === 0
            }"
        >
            <h2
                :class="{
                    'max-h-[400px] overflow-auto': showCompletedMessage,
                    'line-clamp-5': !showCompletedMessage,
                    'text-sm font-normal break-all': true
                }"
            >
                {{ payload.log_application?.message }}
            </h2>
        </div>

        <div v-if="Object.values(payload.code_snippet || {}).length === 0">
            <div v-html="payload.log_application?.context[0]"></div>
        </div>
        <CodeSnippet
            v-else
            :payload="payload || {}"
        />
    </div>
</template>
