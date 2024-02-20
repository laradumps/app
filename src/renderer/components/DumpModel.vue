<template>
    <div class="space-y-3">
        <p
            class="dark:text-primary-300 border-b dark:border-primary-600 pb-1"
            v-text="props.payload.model?.className"
        ></p>
        <div v-html="props.payload.model?.attributes[0]"></div>
        <div v-show="props.payload.model?.relations.length > 0">
            <div class="dark:text-primary-300 py-3">Relations</div>
            <div v-html="props.payload.model?.relations[0]"></div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { defineProps, onMounted } from "vue";
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
