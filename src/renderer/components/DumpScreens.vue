<template>
    <div
        class="select-none gap-1 flex py-1"
        v-for="(screen, index) in screens"
        :key="screen"
    >
        <div
            class="tabs"
            @click="$emit('toggleScreen', screen.screen_name)"
            :class="{
                'ml-1': index > 0,
                'tabs-bordered': screen.screen_name === screenStore.screen && screens.length > 1
            }"
        >
            <input
                type="radio"
                class="tab uppercase font-normal tracking-wider text-[0.65rem]"
                :aria-label="screen.screen_name"
            />
        </div>
    </div>
</template>

<script setup>
import { defineProps, ref, defineEmits } from "vue";
import { useScreenStore } from "@/store/screen";

defineEmits(["toggleScreen"]);

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
.tab {
    @apply px-3;
}
</style>
