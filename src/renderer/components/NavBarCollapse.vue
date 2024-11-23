<script setup>
import IconCollapseClose from "@/components/Icons/IconCollapseClose.vue";
import IconCollapseOpen from "@/components/Icons/IconCollapseOpen.vue";
import { useCollapse } from "@/store/collapse";

const collapseStore = useCollapse();
</script>

<template>
    <button
        :title="$t('collapse')"
        class="w-[32px] h-[34px] px-1.5 py-2 hover:bg-base-200 text-base-content cursor-pointer rounded-md"
        @click="collapseStore.toggle()"
    >
        <IconCollapseClose v-if="!collapseStore.open" />
        <IconCollapseOpen v-else />
    </button>
</template>
