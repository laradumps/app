<template>
    <div class="flex justify-end">
        <div class="relative rounded-md shadow-sm">
            <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <MagnifyingGlassIcon class="w-4 h-4 text-base-700 dark:text-base-400" />
            </div>
            <input
                type="text"
                v-model="globalSearch.search"
                class="!pl-8 py-2 !p-1.5 input !w-40 !text-xs"
                placeholder="Search"
            />
        </div>
    </div>
</template>

<script setup>
import { MagnifyingGlassIcon } from "@heroicons/vue/24/outline";
import { useGlobalSearchStore } from "@/store/global-search";

const globalSearch = useGlobalSearchStore();
</script>
