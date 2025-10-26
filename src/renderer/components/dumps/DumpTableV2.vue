<script setup lang="ts">
import { defineProps, nextTick, computed, ref } from "vue";
import { Payload } from "@/types/Payload";
import VueJsonPretty from "vue-json-pretty";

const props = defineProps<{
    payload: Payload;
}>();

const sfDump = ref(false);

const rows = computed(() => {
    if (!props.payload.table_v2?.values) return [];
    return Object.entries(props.payload.table_v2.values).map(([key, val]) => ({
        key,
        val,
        isObject: typeof val === "object",
        isJsonPretty: typeof val === "object" && typeof val[0] === "object" && typeof val[1] === "object",
        sfDumpId: typeof val === "object" && !(typeof val[0] === "object" && typeof val[1] === "object") ? val[1] : null,
        sfDumpInitated: false
    }));
});

const sfDumpIds = computed(() => {
    return rows.value.filter((row) => row.sfDumpId).map((row) => row.sfDumpId);
});

const initSfDump = () => {
    if (sfDump.value) {
        return;
    }

    sfDump.value = true;

    nextTick(() => {
        sfDumpIds.value.forEach((id) => {
            try {
                window.Sfdump(`sf-dump-${id}`);
            } catch (e) {}
        });
    });
};
</script>

<template>
    <div class="dstable dstable-v2">
        <table
            :id="`table-${props.payload.id}`"
            class="table w-full"
            @mouseover="initSfDump()"
        >
            <tbody class="tbody">
                <tr
                    v-for="(row, index) in rows"
                    :key="index"
                >
                    <td
                        :style="props.payload.table_v2?.headerStyle"
                        class="text-xs p-2 font-semibold bg-base-200"
                    >
                        {{ row.key }}
                    </td>
                    <td style="word-break: break-word">
                        <template v-if="row.isJsonPretty">
                            <VueJsonPretty
                                :data="row.val[0]"
                                :showIcon="true"
                                :showLength="true"
                                :showLine="false"
                            />
                        </template>
                        <template v-else-if="row.isObject">
                            <pre
                                :id="`sf-dump-${row.val[1]}`"
                                class="sf-dump-debug overflow-auto text-xs break-all whitespace-pre-line"
                                data-indent-pad="  "
                                v-html="row.val[0]"
                            ></pre>
                        </template>
                        <template v-else>
                            {{ row.val }}
                        </template>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</template>
