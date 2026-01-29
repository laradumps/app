<script setup>
import { onMounted, ref } from 'vue';
import IconPin from '@/components/Icons/IconPin.vue';

const isAlwaysOnTop = ref(false);

const props = defineProps({
    window: {
        type: String,
        required: false,
        default: 'main'
    }
});

onMounted(() => {
    window.ipcRenderer.send(props.window + ':is-always-on-top');

    window.ipcRenderer.on(props.window + ':is-always-on-top', (event, arg) => {
        isAlwaysOnTop.value = arg.is_always_on_top;
    });

    window.ipcRenderer.on('app:local-shortcut-execute::always_on_top', () => {
        toggleAlwaysOnTop();
    });
});

const toggleAlwaysOnTop = () => {
    isAlwaysOnTop.value = !isAlwaysOnTop.value;

    window.ipcRenderer.send(props.window + ':toggle-always-on-top', isAlwaysOnTop.value);
};
</script>

<template>
    <button
        :title="$t('always_on_top')"
        class="p-2 hover:bg-base-200 text-base-content cursor-pointer rounded-md"
        @click="toggleAlwaysOnTop()"
    >
        <IconPin
            class="w-3.5"
            :fill="isAlwaysOnTop ? 'currentColor' : 'none'"
            :stroke-width="isAlwaysOnTop ? '0' : '8'"
            :class="{ 'text-primary': isAlwaysOnTop }"
        />
    </button>
</template>
