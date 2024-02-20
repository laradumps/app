<template>
    <a
        class="justify-center cursor-pointer flex items-center p-2"
        @click="collapseStore.toggle()"
    >
        <div v-if="!collapseStore.isOpen">
            <IconCollapseClose class="text-base hover:text-neutral" />
        </div>
        <div v-if="collapseStore.isOpen">
            <IconCollapseOpen class="text-base hover:text-neutral" />
        </div>
    </a>
</template>

<script setup>
import IconCollapseOpen from "@/components/Icons/IconCollapseOpen.vue";
import IconCollapseClose from "@/components/Icons/IconCollapseClose.vue";
import { useCollapse } from "@/store/collapse";

const collapseStore = useCollapse();
</script>
