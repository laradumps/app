<template>
    <div class="bg-primary-100 p-2 space-y-2 dark:bg-primary-800 rounded-sm pr-2">
        <div>
            <div>
                <div class="relative rounded-md shadow-sm">
                    <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <!-- SearchIcon -->
                        <MagnifyingGlassIcon class="w-5 h-5 text-primary-700 dark:text-primary-200" />
                    </div>
                    <input
                        type="text"
                        v-model="search"
                        class="block w-full p-2 dark:bg-primary-700 text-primary-500 focus:outline-none focus:ring-1 focus:text-primary-700 dark:text-primary-100 dark:placeholder-primary-400 rounded-md border-gray-300 pl-10 dark:!border-primary-400 focus:border-primary-400 focus:ring-primary-500 text-xs"
                        placeholder="Search"
                    />
                </div>
                <div
                    class="overflow-x-auto rounded-lg max-h-[412px] dstable"
                    v-html="table"
                ></div>
            </div>
        </div>
    </div>
</template>

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

    thr.setAttribute("class", "text-xs border border-primary-300 rounded-md shadow-sm bg-primary-200 dark:bg-primary-700 dark:text-primary-400 dark:border-primary-800 text-gray-800");
    table.setAttribute("id", `table-${payloadId}`);

    fieldTitles.forEach((fieldTitle) => {
        const th = document.createElement("th");
        th.appendChild(document.createTextNode(fieldTitle));
        thr.appendChild(th);
    });
    thead.appendChild(thr);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    let tr = document.createElement("tr");

    tbody.setAttribute("class", "tbody bg-white");

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
