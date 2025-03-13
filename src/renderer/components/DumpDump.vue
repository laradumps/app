<script setup lang="ts">
import { defineProps } from "vue";
import { Payload } from "@/types/Payload";
import VueJsonPretty from "vue-json-pretty";

defineProps<{
    payload: Payload;
}>();
</script>

<template>
    <div>
        <div v-if="payload.hasOwnProperty('cols')">
            <div class="flex gap-2 w-full">
                <div
                    class="w-full"
                    v-for="(content, i) in payload.dump?.original_content"
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
            v-else-if="!payload.hasOwnProperty('cols')"
            v-show="payload.dump?.dump !== ''"
            class="text-base-content break-all"
        >
            <span
                v-if="payload.dump?.variable_type === 'string'"
                v-text="payload.dump.dump"
            ></span>
            <span
                v-else
                :id="`dump-content-${payload.sf_dump_id}`"
                v-html="payload.dump?.dump === null ? 'null' : payload.dump?.dump"
            ></span>
        </div>
    </div>
</template>
