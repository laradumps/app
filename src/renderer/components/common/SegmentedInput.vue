<script setup lang="ts">
import { useId } from 'vue';

defineProps<{
    options: Record<string, string>;
    label: string;
}>();

const emit = defineEmits<{ change: [] }>();
const model = defineModel<string>();
const name = useId();

const pick = (value: string) => {
    model.value = value;
    emit('change');
};
</script>

<template>
    <div
        role="radiogroup"
        :aria-label="label"
        class="tabs tabs-box tabs-sm bg-base-200/50 flex-nowrap"
    >
        <input
            v-for="(text, value) in options"
            :key="value"
            type="radio"
            :name="name"
            class="tab whitespace-nowrap"
            :aria-label="text"
            :checked="model === value"
            @change="pick(String(value))"
        />
    </div>
</template>
