<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import hotkeys from 'hotkeys-js';
import { useI18n } from 'vue-i18n';
import { useSettingsStore } from '@/store/settings';
import { useSettingsSave } from '@/composables/useSettingsSave';
import SettingsRow from '../SettingsRow.vue';

const settingsStore = useSettingsStore();
const { save } = useSettingsSave();
const i18n = useI18n();

const editMode = ref(false);

onMounted(() => {
    nextTick(() => {
        loadSavedShortcuts();
        bindHotkeyCapture();
    });
});

onBeforeUnmount(() => hotkeys.unbind('*'));

const loadSavedShortcuts = () => {
    window.ipcRenderer.send('local-shortcut:get');
    window.ipcRenderer.on('app:local-shortcut::list', (_arg, shortcuts) => {
        shortcuts.forEach((entry) => {
            if (entry.hasOwnProperty('shortcut')) {
                const id = entry.shortcut.replace('ds_shortcut_', '');
                try {
                    const input = document.getElementById(id) as HTMLInputElement | null;
                    if (input !== null) {
                        input.value = entry.keys.beautifyShortcut();
                    }
                } catch (err) {
                    console.log('Error: ', err);
                }
            }
        });
    });
};

const bindHotkeyCapture = () => {
    let activeInput: HTMLInputElement | null = null;
    const inputs = [...document.getElementsByClassName('js-shortcut')] as HTMLInputElement[];

    inputs.forEach((input) => {
        input.addEventListener('click', (event) => (activeInput = event.target as HTMLInputElement), false);
        input.addEventListener('blur', () => (activeInput = null), false);
    });

    hotkeys('*', () => {
        const keys = hotkeys.getPressedKeyString().join('+');
        if (activeInput) {
            activeInput.value = keys.beautifyShortcut();
        }
    });
};

const editShortcut = () => {
    editMode.value = true;
    window.ipcRenderer.send('settings.clear-shortcuts', {});
};

const saveShortcuts = async () => {
    document.querySelectorAll<HTMLInputElement>('.js-shortcut').forEach((element) => {
        if (element.value.toString() !== '') {
            const shortcut = {
                label: element.dataset.label,
                originalValue: element.value,
                keys: element.value.toElectronFormat()
            };
            settingsStore.settings.shortcuts[element.name] = shortcut;
            window.ipcRenderer.send('local-shortcut:set', shortcut);
        }
    });

    await save();
    window.ipcRenderer.send('settings.init-shortcuts');
    alert(i18n.t('settings.shortcut.save_message'));
    editMode.value = false;
};
</script>

<template>
    <div>
        <SettingsRow
            v-for="(shortcut, key) in settingsStore.settings.shortcuts"
            :key="key"
            :label="$t(shortcut.label)"
        >
            <input
                type="text"
                :disabled="!editMode"
                readonly
                :placeholder="editMode ? $t('settings.shortcut_placeholder') : ''"
                :name="key"
                :data-label="shortcut.label"
                :id="key"
                class="js-shortcut disabled:text-base-content/80 input input-bordered input-sm w-52"
                :value="shortcut.originalValue"
            />
        </SettingsRow>

        <div class="mt-5 flex gap-2 justify-end">
            <button
                @click="editShortcut"
                type="button"
                class="btn btn-sm btn-ghost"
            >
                {{ $t('settings.edit') }}
            </button>
            <button
                @click="saveShortcuts"
                type="button"
                class="btn btn-sm btn-primary"
            >
                {{ $t('settings.save') }}
            </button>
        </div>
    </div>
</template>
