<script setup lang="ts">
import { defineProps, nextTick, onMounted } from "vue";
import { Payload } from "@/types/Payload";

const props = defineProps<{
    payload: Payload;
}>();

onMounted(() => {
    window.Sfdump(`sf-dump-${props.payload.model?.attributes[1]}`);
    if (props.payload.model?.relations.length > 0) {
        window.Sfdump(`sf-dump-${props.payload.model?.relations[1]}`);
    }
});
</script>

<template>
    <div class="space-y-3">
        <span
            class="pb-1 font-normal font-sans text-base-content"
            v-text="props.payload.model?.className"
        ></span>
        <div v-html="props.payload.model?.attributes[0]"></div>
        <div v-show="props.payload.model?.relations.length > 0">
            <div class="py-3">Relations</div>
            <div v-html="props.payload.model?.relations[0]"></div>
        </div>
    </div>
</template>
