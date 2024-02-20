<template>
    <a
        @click="reorderStore.toggle()"
        :title="$t('menu.reorder')"
        class="justify-center cursor-pointer text-base-500 group flex items-center p-2"
    >
        <IconReOrder
            class="rounded-full dark:text-base-400 dark:hover:text-base-200"
            :class="{
                '!text-rose-600 !dark:text-rose-400': reorderStore.reverse
            }"
        />
    </a>
</template>

<script setup>
import IconReOrder from "@/components/Icons/IconReOrder.vue";
import { useReorder } from "@/store/reorder";

const reorderStore = useReorder();
</script>
