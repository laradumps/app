<template>
    <a
        class="justify-center cursor-pointer text-base-500 group flex items-center p-2"
        @click="collapseStore.toggle()"
    >
        <div v-if="!collapseStore.isOpen">
            <IconCollapseClose class="hover:text-base-900 dark:text-base-400 dark:hover:text-base-300" />
        </div>
        <div v-if="collapseStore.isOpen">
            <IconCollapseOpen class="hover:text-base-900 dark:text-base-400 dark:hover:text-base-300" />
        </div>
    </a>
</template>

<script setup>
import IconCollapseOpen from "@/components/Icons/IconCollapseOpen.vue";
import IconCollapseClose from "@/components/Icons/IconCollapseClose.vue";
import { useCollapse } from "@/store/collapse";

const collapseStore = useCollapse();
</script>
