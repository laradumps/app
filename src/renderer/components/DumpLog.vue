<template>
    <div
        id="log"
        class="space-y-3"
    >
        <div class="dark:text-primary-300 dark:bg-primary-800 rounded-t-sm">
            {{ props.payload.log_application.message }}
        </div>

        <div v-html="props.payload.log_application?.context[0]"></div>

        <div
            class="bg-primary-100 dark:bg-primary-800 rounded-t-sm"
            v-html="searchBar"
        ></div>
    </div>
</template>

<script setup lang="ts">
import { computed, defineProps, onMounted } from "vue";
import { Payload } from "@/types/Payload";

const props = defineProps<{
    payload: Payload;
}>();

const searchBar = computed(() => {
    const { level, message } = props.payload.log_application;

    const levelsWithSearchBar = ["emergency", "error", "critical"];

    const searchOptions = [
        { name: "Google", url: "https://www.google.com/search?q=" },
        {
            name: "Stack Overflow",
            url: "https://stackoverflow.com/search?q="
        },
        { name: "Laracasts", url: "https://laracasts.com/discuss?q=" }
    ];

    let searchBar = "";

    if (levelsWithSearchBar.includes(<string>level)) {
        // Try to remove the PHP file path for better result searches
        const searchString = encodeURIComponent(message.replace(/(;|\/)([^;]*.php)/, ""));

        searchOptions.forEach(
            (searchOption) =>
                (searchBar += `<button @click="openLink('${searchOption.url}${searchString}')" class="btn !w-auto flex-shrink-0 btn-white rounded-t-sm text-xs justify-center items-center select-none">🔎  ${searchOption.name}</button>`)
        );

        searchBar = `<div class="my-2 flex text-xs dark:text-primary-700 space-x-2">${searchBar}</div>`;
    }

    return searchBar;
});

const openLink = (value) => {
    window.ipcRenderer.send("main:openLink", value);
};

onMounted(() => {
    const { context } = props.payload.log_application;

    window.Sfdump(`sf-dump-${context[1]}`);
});
</script>
<style>
#log pre.sf-dump,
pre.sf-dump .sf-dump-default {
    border-radius: 0px !important;
}
</style>
