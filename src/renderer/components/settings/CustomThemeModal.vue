<script setup lang="ts">
import { ref, watch } from 'vue';
import { useSettingsStore } from '@/store/settings';
import { useSettingsSave } from '@/composables/useSettingsSave';

const settingsStore = useSettingsStore();
const { save } = useSettingsSave();

const dialog = ref<HTMLDialogElement | null>(null);
const customCss = ref(settingsStore.settings.custom_css);

watch(
    () => settingsStore.settings.custom_css,
    (value) => (customCss.value = value)
);

const open = () => dialog.value?.showModal();

const openThemeGenerator = () => {
    window.ipcRenderer.send('main:openLink', 'https://daisyui.com/theme-generator');
};

const saveCustomTheme = async () => {
    settingsStore.settings.custom_css = customCss.value.replace(/@plugin.*?{([\s\S]*?)}/g, `[data-theme="custom"] { $1 }`);
    settingsStore.settings.theme = 'custom';

    await save();
    window.ipcRenderer.send('reload');
};

defineExpose({ open });
</script>

<template>
    <dialog
        ref="dialog"
        class="modal modal-middle"
    >
        <div class="modal-box">
            <h3 class="text-lg font-bold">{{ $t('settings.custom_theme') }}</h3>
            <fieldset class="fieldset w-full">
                <legend class="fieldset-legend">{{ $t('settings.custom_theme_message') }}</legend>
                <span
                    @click="openThemeGenerator"
                    class="cursor-pointer link fieldset-label"
                    >https://daisyui.com/theme-generator</span
                >
                <textarea
                    class="textarea rounded-lg h-80 w-full"
                    v-model="customCss"
                ></textarea>
            </fieldset>
            <div class="modal-action">
                <form
                    method="dialog"
                    class="flex gap-3"
                >
                    <button class="btn btn-sm">{{ $t('settings.close') }}</button>
                    <button
                        @click="saveCustomTheme"
                        type="button"
                        class="btn btn-sm btn-primary"
                    >
                        {{ $t('settings.save') }}
                    </button>
                </form>
            </div>
        </div>
    </dialog>
</template>
