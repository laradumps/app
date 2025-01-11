<script setup lang="ts">
import { ref, watch } from "vue";

// Define props
const props = defineProps({
    modelValue: [String, Number]
});

// Local state for the selected value
const inputValue = ref(props.modelValue);

// Emit the change event to update the parent component
const emit = defineEmits(["update:modelValue"]);

const emitChange = () => {
    emit("update:modelValue", inputValue.value);
};

// Watch for changes in the prop modelValue to update the local state
watch(
    () => props.modelValue,
    (newValue) => {
        inputValue.value = newValue;
    }
);
</script>

<template>
    <input
        type="text"
        v-model="inputValue"
        @input="emitChange"
        class="text-sm h-7 py-1 px-2 rounded-md bg-base-100"
        v-bind="$attrs"
    />
</template>
