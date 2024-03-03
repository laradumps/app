<template>
    <div
        class="select-none gap-1 flex py-1"
        v-for="(screen, index) in screens"
        :key="screen"
    >
        <button
            :class="{
                'ml-1': index > 0,
                'active !btn-primary': screen.screen_name === screenStore.screen && screens.length > 1,
                'transition-all ease-in duration-100 !btn-primary': screen.screen_name === screenStore.screen && index > 0
            }"
            class="btn btn-neutral uppercase tracking-wider !text-[9px] !flex rounded-none"
            @click="$emit('toggleScreen', screen.screen_name)"
        >
            <span v-text="screen.screen_name"></span>
        </button>
    </div>
</template>

<script setup>
import { defineProps, ref, defineEmits } from "vue";
import { useScreenStore } from "@/store/screen";

defineEmits(['toggleScreen']);

const screenStore = useScreenStore();

const props = defineProps({
    screens: {
        type: Array,
        default: null
    },
    payload: {
        type: Array,
        default: null
    }
});
</script>
<style scoped>
.active {
    @apply border-2;
}
</style>
