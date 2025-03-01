<script setup lang="ts">
import { defineProps, onMounted } from "vue";
import { Payload } from "@/types/Payload";

const props = defineProps<{
    payload: Payload;
}>();

onMounted(() => {
    window.Sfdump(`sf-dump-${props.payload.model?.attributes[1]}`);
    if (props.payload.model?.relations && props.payload.model?.relations.length > 0) {
        window.Sfdump(`sf-dump-${props.payload.model?.relations[1]}`);
    }
});
</script>

<template>
    <div class="flex flex-col gap-3">
        <div class="prose">
            <h4
                class="text-base-content"
                v-text="payload.model?.className"
            ></h4>
        </div>

        <div v-html="payload.model?.attributes[0]"></div>
        <div
            class="flex flex-col gap-2"
            v-show="payload.model?.relations.length > 0"
        >
            <span>Relations</span>
            <div v-html="payload.model?.relations[0]"></div>
        </div>
    </div>
</template>
