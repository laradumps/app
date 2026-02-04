<script setup>
import IconCollapseClose from '@/components/Icons/IconCollapseClose.vue';
import IconCollapseOpen from '@/components/Icons/IconCollapseOpen.vue';
import { useCollapse } from '@/store/collapse';

const collapseStore = useCollapse();
</script>

<template>
    <button
        :title="$t('collapse')"
        class="p-2 px-3 flex items-center hover:bg-base-200 text-base-content cursor-pointer rounded-md"
        @click="collapseStore.toggle()"
    >
        <IconCollapseClose v-if="!collapseStore.open" />
        <IconCollapseOpen v-else />
    </button>
</template>
