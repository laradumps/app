<script setup lang="ts">
import { ref, watch } from "vue";

// Define props
const props = defineProps({
    modelValue: [String, Number],
    placeholder: [String]
});

// Local state for the selected value
const selectedValue = ref(props.modelValue);

// Emit the change event to update the parent component
const emit = defineEmits(["update:modelValue"]);

const emitChange = () => {
    emit("update:modelValue", selectedValue.value);
};

// Watch for changes in the prop modelValue to update the local state
watch(
    () => props.modelValue,
    (newValue) => {
        selectedValue.value = newValue;
    }
);
</script>

<template>
    <div>
        <select
            v-model="selectedValue"
            @change="emitChange"
            class="select select-bordered select-md w-full max-w-xs"
        >
            <option
                value=""
                selected
                disabled
            >
                {{ placeholder }}
            </option>
            <slot></slot>
        </select>
    </div>
</template>
