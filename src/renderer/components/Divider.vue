<script setup lang="ts">
import { computed } from "vue";

const props = defineProps({
    class: {
        type: String,
        default: ""
    }
});

const classes = computed(() => {
    let defaultClasses = "h-[1px] border-t border-base-300";
    return `${defaultClasses} ${props.class}`;
});
</script>

<template>
    <div :class="classes"></div>
</template>

<style scoped></style>
