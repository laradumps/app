<script setup lang="ts">
import { computed, defineProps, nextTick, onMounted } from "vue";
import { Payload } from "@/types/Payload";

const props = defineProps<{
    payload: Payload;
}>();

const hasRelation = computed(() => {
    return props.payload.model?.relations && props.payload.model?.relations.length > 0;
});

onMounted(() => {
    window.Sfdump(`sf-dump-${props.payload.model?.attributes[1]}`);
    if (hasRelation) {
        window.Sfdump(`sf-dump-${props.payload.model?.relations[1]}`);
    }
});
</script>

<template>
    <div class="space-y-3">
        <span
            class="pb-1 sf-dump-key text-base-content"
            v-text="payload.model?.className"
        ></span>
        <div v-html="payload.model?.attributes[0]"></div>
        <div v-show="hasRelation">
            <div class="py-3">Relations</div>
            <div v-html="payload.model?.relations[0]"></div>
        </div>
    </div>
</template>
