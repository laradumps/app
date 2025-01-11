<script setup lang="ts">
import { computed } from "vue";

const props = defineProps({
    class: {
        type: String,
        default: ""
    }
});

const classes = computed(() => {
    let defaultClasses =
        "inline-flex h-6 text-sm w-max min-w-max items-center justify-center rounded-md border border-transparent bg-base-600 px-4 py-1 text-white outline-0 transition hover:bg-base-700 disabled:hover:bg-base-600 focus:border-base-300 focus:border-base-700 focus:ring active:bg-base-700 disabled:opacity-25 focus:border-base-700 focus:ring-base-700 focus:ring-opacity-40";
    return `${defaultClasses} ${props.class}`;
});
</script>

<template>
    <button :class="classes">
        <slot></slot>
    </button>
</template>

<style scoped></style>
