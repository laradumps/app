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

    thr.setAttribute("class", "text-xs uppercase");
    table.setAttribute("id", `table-${payloadId}`);
    table.setAttribute("class", "table text-base-content");

    fieldTitles.forEach((fieldTitle) => {
        const th = document.createElement("th");
        th.appendChild(document.createTextNode(fieldTitle));
        thr.appendChild(th);
    });
    thead.appendChild(thr);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    let tr = document.createElement("tr");

    objectArray.forEach((object) => {
        tr = document.createElement("tr");

        fields.forEach((field) => {
            const td = document.createElement("td");
            td.setAttribute("style", "word-break: break-all;");
            td.appendChild(document.createTextNode(object[field]));
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    div.appendChild(table);

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
    <div class="space-y-2 rounded-sm pr-2">
        <div>
            <div>
                <div class="flex justify-start">
                    <label class="flex justify-end input input-bordered input-sm items-e gap-2 max-w-[200px]">
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
                    class="overflow-x-auto rounded-lg max-h-[412px]"
                    v-html="table"
                ></div>
            </div>
        </div>
    </div>
</template>
