<template>
    <div>
        <button
            type="button"
            @mouseleave="removeLivewireHighLight"
            @click="
                handleLivewireDumpCard();
                $el.focus();
            "
            :class="{ '!bg-indigo-500 !text-white': selected === payload.content.component.id }"
            class="p-2 mb-2 shadow-md rounded dark:bg-base-800 bg-base-50 cursor-pointer items-start group-focus:text-white w-full text-xs text-base-700 hover:text-base-800 font-normal dark:text-base-300 font-medium text-gray-500 hover:bg-base-200"
        >
            <div class="group relative flex justify-between items-center">
                <span
                    class="text-left break-all"
                    v-text="payload.content.component.name"
                ></span>
            </div>
        </button>
    </div>
</template>

<script setup>
import { defineProps, defineEmits, onMounted } from "vue";

const props = defineProps({
    payload: {
        type: Object,
        default: null
    },
    selected: {
        type: String,
        default: null
    }
});

const emit = defineEmits(["selectedLivewireComponent", "removeLivewireHighLight"]);

const removeLivewireHighLight = () => {
    emit("removeLivewireHighLight", props.payload);
};

const handleLivewireDumpCard = () => {
    emit("selectedLivewireComponent", props.payload);
};

onMounted(() => {
    emit("selectedLivewireComponent", props.payload);
});
</script>
<style scoped>
.title {
    display: inline-block;

    text-transform: lowercase;
}

.title:first-letter {
    text-transform: uppercase;
}
</style>
