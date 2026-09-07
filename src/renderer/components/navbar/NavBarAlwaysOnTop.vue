<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import IconPin from '@/components/Icons/IconPin.vue';
import IconButton from '@/components/common/IconButton.vue';

const isAlwaysOnTop = ref(false);

const props = defineProps({
    window: {
        type: String,
        required: false,
        default: 'main'
    }
});

const onIsAlwaysOnTop = (_event: unknown, arg: { is_always_on_top: boolean }) => {
    isAlwaysOnTop.value = arg.is_always_on_top;
};

const onToggleShortcut = () => {
    toggleAlwaysOnTop();
};

onMounted(() => {
    window.ipcRenderer.send(props.window + ':is-always-on-top');
    window.ipcRenderer.on(props.window + ':is-always-on-top', onIsAlwaysOnTop);
    window.ipcRenderer.on('app:local-shortcut-execute::always_on_top', onToggleShortcut);
});

onUnmounted(() => {
    window.ipcRenderer.removeListener(props.window + ':is-always-on-top', onIsAlwaysOnTop);
    window.ipcRenderer.removeListener('app:local-shortcut-execute::always_on_top', onToggleShortcut);
});

const toggleAlwaysOnTop = () => {
    isAlwaysOnTop.value = !isAlwaysOnTop.value;

    window.ipcRenderer.send(props.window + ':toggle-always-on-top', isAlwaysOnTop.value);
};
</script>

<template>
    <IconButton
        :label="$t('always_on_top')"
        :active="isAlwaysOnTop"
        @click="toggleAlwaysOnTop()"
    >
        <IconPin
            class="size-4"
            :fill="isAlwaysOnTop ? 'currentColor' : 'none'"
            :stroke-width="isAlwaysOnTop ? '0' : '8'"
        />
    </IconButton>
</template>
