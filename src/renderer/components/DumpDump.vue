<script setup lang="ts">
import { computed, defineProps } from "vue";
import { Payload } from "@/types/Payload";
import VueJsonPretty from "vue-json-pretty";

const props = defineProps<{
    payload: Payload;
}>();

const isExplainPlan = computed(() => {
    return props.payload.dump?.variable_type === 'string' && props.payload.with_label?.label?.toLowerCase().includes('explain');
});

const formattedDump = computed(() => {
    if (props.payload.dump?.variable_type === 'string') {
        return props.payload.dump.dump
            .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;')
            .replace(/\n/g, '<br>')
            .replace(/->/g, '→');
    }
    return props.payload.dump?.dump;
});

const rawDumpContent = computed(() => {
    return props.payload.dump?.dump === null ? 'null' : props.payload.dump?.dump;
});
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
            <template v-if="isExplainPlan">
                <span
                    v-html="formattedDump"
                    style="white-space: pre-wrap; font-family: monospace; line-height: 1.5"
                ></span>
            </template>

            <template v-else>
                <span
                    v-if="payload.dump?.variable_type === 'string'"
                    x-text="payload.dump?.dump"
                    style="white-space: pre"
                ></span>
                <span
                    v-else
                    :id="`dump-content-${payload.sf_dump_id}`"
                    v-text="rawDumpContent"
                ></span>
            </template>
        </div>
    </div>
</template>
