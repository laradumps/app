<script setup lang="ts">
import { defineProps, nextTick, onMounted, ref } from "vue";
import { Payload } from "@/types/Payload";
import VueJsonPretty from "vue-json-pretty";
import { createApp, defineComponent } from "vue";

const props = defineProps<{
    payload: Payload;
}>();

const table = ref("");

onMounted(() => {
    const tableV2 = createTableV2(props.payload.table_v2?.values, props.payload.id, props.payload.table_v2?.headerStyle);
    table.value = tableV2.div.innerHTML;

    nextTick(() => {
        tableV2.elements.forEach((el) => {
            try {
                window.Sfdump(el);
            } catch (e) {}
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
        keyTd.setAttribute("class", "text-xs p-2 font-semibold bg-neutral");
        keyTd.appendChild(document.createTextNode(key));
        tr.appendChild(keyTd);

        const td = document.createElement("td");

        if (["Headers", "Body", "Cookies", "Data"].includes(key)) {
            elements.push(`sf-dump-${val[1]}`);
            const preAttributes = document.createElement("pre");
            preAttributes.setAttribute("class", "sf-dump-debug overflow-auto text-xs break-all whitespace-pre-line");
            preAttributes.setAttribute("id", `sf-dump-${val[1]}`);
            preAttributes.setAttribute("data-indent-pad", "  ");
            preAttributes.innerHTML = val[0];

            td.setAttribute("style", "word-break: break-word;")
            td.innerHTML = preAttributes.outerHTML;
        } else {
            if (typeof val[0] === "object") {
                const container = document.createElement("div");
                const VueJsonPrettyComponent = defineComponent(VueJsonPretty);
                const propsData = {
                    showIcon: true,
                    showLength: true,
                    showLine: false,
                    data: val[0]
                };
                const vueInstance = createApp(VueJsonPrettyComponent, propsData);
                const mountedComponent = vueInstance.mount(container);

                td.setAttribute("style", "word-break: break-word;")
                td.appendChild(container);
                elements.push(mountedComponent);
            } else {
                td.setAttribute("style", "word-break: break-word;")
                td.innerText = val[0];
            }
        }

        tr.appendChild(td);

        tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    div.appendChild(table);

    return { div, elements };
};
</script>

<template>
    <div class="dstable dstable-v2">
        <div v-html="table"></div>
    </div>
</template>
