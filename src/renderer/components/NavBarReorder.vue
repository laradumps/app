<template>
    <a
        @click="reorderStore.toggle()"
        :title="$t('menu.reorder')"
        class="justify-center cursor-pointer text-base-500 group flex items-center p-2"
    >
        <IconReOrder
            class="rounded-ful"
            :class="{
                '!text-primary': reorderStore.reverse
            }"
        />
    </a>
</template>

<script setup>
import IconReOrder from "@/components/Icons/IconReOrder.vue";
import { useReorder } from "@/store/reorder";

const reorderStore = useReorder();
</script>
