<script setup lang="ts">
import { defineProps } from "vue";
import { Payload } from "@/types/Payload";

const props = defineProps<{
    payload: Payload;
}>();
</script>

<template>
    <div class="w-full text-base-content text-sm">
        &#8987; {{ $t("elapsed_time") }}:

        <div class="mt-3 px-5 font-semibold">
            <div v-if="props.payload.time_track?.elapsed_time">{{ props.payload.time_track?.elapsed_time }}</div>
            <div
                class="animate-pulse"
                v-else
            >
                {{ $t("processing") }} ...
            </div>
        </div>
    </div>
</template>
