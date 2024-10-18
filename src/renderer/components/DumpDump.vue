<script setup lang="ts">
import { defineProps } from "vue";
import { Payload } from "@/types/Payload";
import VueJsonPretty from "vue-json-pretty";

const props = defineProps<{
    payload: Payload;
}>();
</script>

<template>
    <div>
        <div v-if="props.payload.hasOwnProperty('cols')">
            <div class="flex gap-2 w-full">
                <div
                    class="w-full"
                    v-for="(content, i) in props.payload.dump?.original_content"
                    :key="i"
                >
                    <VueJsonPretty
                        :show-icon="true"
                        :show-length="true"
                        :show-line="false"
                        :data="content"
                        :deep="1"
                    />
                </div>
            </div>
        </div>
        <div
            v-else-if="!props.payload.hasOwnProperty('cols')"
            :id="`dump-content-${props.payload.sf_dump_id}`"
            v-show="props.payload.dump?.dump !== ''"
            class="text-base-content break-all"
            v-html="props.payload.dump?.dump === null ? 'null' : props.payload.dump.dump"
        ></div>
    </div>
</template>

<style scoped></style>
