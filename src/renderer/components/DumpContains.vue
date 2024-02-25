<template>
    <div
        class="text-base-content"
        v-if="props.payload.str_contains"
    >
        <div class="flex w-full left-0 items-center p-2">
            <div
                class="items-center w-[0.50rem] h-[0.50rem] mr-2 rounded-full"
                :class="{ [containsStyle]: true }"
            ></div>
            <span class="flex gap-2 dark:text-base-300"
                >{{ containsText }}
                <div class="underline">{{ containsHTML }}</div>
            </span>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, defineProps } from "vue";
import { Payload } from "@/types/Payload";
import * as Helper from "@/helpers";

const containsStyle = computed(() => (props.payload.str_contains?.success ? "bg-green-500" : "bg-red-500"));

const containsText = computed(() => (props.payload.str_contains?.success ? "Text contains:" : "Text does not contain:"));

const containsHTML = computed(() => Helper.escapeHtml(props.payload.str_contains?.search_string));

const props = defineProps<{
    payload: Payload;
}>();
</script>
