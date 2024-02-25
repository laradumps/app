<template>
    <div class="dstable">
        <div v-html="table"></div>
    </div>
</template>

<script setup lang="ts">
import { defineProps, nextTick, onMounted, ref } from "vue";
import { Payload } from "@/types/Payload";

const props = defineProps<{
    payload: Payload;
}>();

const table = ref("");

onMounted(() => {
    const tableV2 = createTableV2(props.payload.table_v2?.values, props.payload.id, props.payload.table_v2?.headerStyle);
    table.value = tableV2.div.innerHTML;

    nextTick(() => {
        tableV2.elements.forEach((el) => {
            window.Sfdump(el);
        });
    });
});

const createTableV2 = (values: string[] | undefined, payloadId: string, headerStyle: string[] | undefined) => {
    const elements: string[] = [];
    const div = document.createElement("div");
    const table = document.createElement("table");

    // div.setAttribute("class", "overflow-x-auto rounded-lg");
    table.setAttribute("id", `table-${payloadId}`);
    table.setAttribute("class", "table w-full");

    const tbody = document.createElement("tbody");
    let tr = document.createElement("tr");

    tbody.setAttribute("class", "tbody");

    Object.entries(values).forEach(([key, val]) => {
        tr = document.createElement("tr");

        const keyTd = document.createElement("td");
        keyTd.setAttribute("style", headerStyle);
        keyTd.setAttribute("class", "p-2 font-semibold bg-base-200 dark:bg-base-700 dark:text-base-400");
        keyTd.appendChild(document.createTextNode(key));
        tr.appendChild(keyTd);

        const td = document.createElement("td");

        if (["Headers", "Body", "Cookies", "Data", "Value"].includes(key)) {
            elements.push(`sf-dump-${val[1]}`);
            const preAttributes = document.createElement("pre");
            preAttributes.setAttribute("class", "sf-dump-debug");
            preAttributes.setAttribute("id", `sf-dump-${val[1]}`);
            preAttributes.setAttribute("data-indent-pad", "  ");
            preAttributes.innerHTML = val[0];

            td.innerHTML = preAttributes.outerHTML;
        } else {
            td.innerHTML = val[0];
        }

        tr.appendChild(td);

        tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    div.appendChild(table);

    return { div, elements };
};
</script>
