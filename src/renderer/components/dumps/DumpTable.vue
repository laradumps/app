<script setup lang="ts">
import { defineAsyncComponent, onMounted, ref, watch } from "vue";
import { MagnifyingGlassIcon } from "@heroicons/vue/24/outline";

import { Payload } from "@/types/Payload";

const props = defineProps<{
    payload: Payload;
}>();

const search = ref("");
const table = ref("");

watch(search, (value) => {
    searchableTable(value, props.payload.id);
});

onMounted(() => {
    table.value = createTable(props.payload.table?.values, props.payload.table?.fields, props.payload.table?.header, props.payload.id);
});

const createTable = (objectArray: string[] | undefined, fields: string[] | undefined, fieldTitles: string[] | undefined, payloadId: string) => {
    const div = document.createElement("div");
    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const thr = document.createElement("tr");

    thr.setAttribute("class", "text-xs");
    table.setAttribute("id", `table-${payloadId}`);
    table.setAttribute("class", "table w-full overflow-auto text-base-content !mt-0");

    fieldTitles.forEach((fieldTitle) => {
        const th = document.createElement("th");
        th.appendChild(document.createTextNode(fieldTitle));
        th.setAttribute("class", "!lowercase");
        thr.appendChild(th);
    });
    thead.appendChild(thr);
    thead.setAttribute("class", "top-0 sticky z-10 bg-base-200 text-base-content/70");
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    let tr = document.createElement("tr");

    objectArray.forEach((object) => {
        tr = document.createElement("tr");

        fields.forEach((field) => {
            const td = document.createElement("td");
            td.appendChild(document.createTextNode(object[field]));
            td.setAttribute("class", "whitespace-nowrap");
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });

    const footer = document.createElement("tfoot");
    const footerRow = document.createElement("tr");
    const footerCell = document.createElement("td");
    footerCell.setAttribute("colspan", "999");
    footerCell.appendChild(document.createTextNode(`Total Records: ${objectArray.length}`));
    footerCell.setAttribute("class", "p-2 text-xs");
    footerRow.appendChild(footerCell);
    footer.appendChild(footerRow);

    footer.setAttribute("class", "sticky bottom-0 z-10 bg-base-200 text-base-content/70");

    table.appendChild(tbody);
    table.appendChild(footer);

    div.appendChild(table);
    div.setAttribute("class", "relative");

    return div.innerHTML;
};

const searchableTable = (search, id) => {
    const table = document.getElementById(`table-${id}`);

    if (!table) {
        console.warn(`Table with id 'table-${id}' not found.`);
        return;
    }

    const filter = search.trim().toUpperCase();
    const rows = Array.from(table.getElementsByTagName("tr")).slice(1);

    rows.forEach((row) => {
        const cells = Array.from(row.getElementsByTagName("td"));
        const matchesSearch = cells.some((cell) => cell.innerHTML.toUpperCase().includes(filter));

        row.style.display = matchesSearch ? "" : "none";
    });
};
</script>

<template>
    <div>
        <div class="w-[calc(100vw-70px)] flex flex-col gap-3">
            <div class="flex justify-end mt-1">
                <label class="flex !justify-end input input-bordered input-sm gap-2 max-w-[300px]">
                    <input
                        v-model="search"
                        type="text"
                        class="grow text-base-content"
                        placeholder="Search"
                    />
                    <MagnifyingGlassIcon class="w-4 h-4 text-base" />
                </label>
            </div>

            <div
                class="overflow-x-auto rounded-box border border-base-content/5 bg-base-100 dstable rounded-lg max-h-[429px]"
                v-html="table"
            ></div>
        </div>
    </div>
</template>
