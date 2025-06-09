<script setup lang="ts">
import VueJsonPretty from "vue-json-pretty";
import { computed, defineProps } from "vue";
import { Payload } from "@/types/Payload";

const props = defineProps<{
    payload: Payload;
}>();

const value = computed(() => {
    if (typeof props.payload.json?.string == "object") {
        return props.payload.json?.string;
    }

    return JSON.parse(props.payload.json?.string ?? "");
});

function countNodes(obj: any): number {
    if (typeof obj !== "object" || obj === null) return 0;

    let count = 0;
    const stack = [obj];

    while (stack.length) {
        const node = stack.pop();
        if (typeof node === "object" && node !== null) {
            count++;
            for (const key in node) {
                if (Object.prototype.hasOwnProperty.call(node, key)) {
                    stack.push(node[key]);
                }
            }
        }
    }

    return count;
}

const shouldCollapse = computed(() => countNodes(value.value) >= 4);
</script>

<template>
    <div class="text-base-content">
        <VueJsonPretty
            :data="value"
            :show-icon="true"
            :show-lenght="true"
            :show-line="false"
            :show-line-number="true"
            v-bind:collapsed-node-length="shouldCollapse ? 4 : undefined"
            :show-double-quotes="false"
        />
    </div>
</template>
<style>
@reference "./../styles.css";

.vjs-key {
    @apply !text-sm;
}
.vjs-tree-node:hover {
    background-color: transparent !important;
}
.vjs-node-index {
    @apply text-base-content/40;
}
.vjs-carets {
    @apply text-base-content/70 top-[6px] cursor-pointer right-[2px] absolute;
}
</style>
