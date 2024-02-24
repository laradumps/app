<template>
    <label class="input input-bordered input-sm flex items-center gap-2">
        <input
            v-model="globalSearch.search"
            type="text"
            class="grow input-xs"
            placeholder="Search"
        />
        <MagnifyingGlassIcon class="w-4 h-4 opacity-70" />
    </label>
</template>

<script setup>
import { MagnifyingGlassIcon } from "@heroicons/vue/24/outline";
import { useGlobalSearchStore } from "@/store/global-search";

const globalSearch = useGlobalSearchStore();
</script>
