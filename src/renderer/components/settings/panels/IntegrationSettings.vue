<script setup lang="ts">
import { useSettingsStore } from '@/store/settings';
import { useSettingsSave } from '@/composables/useSettingsSave';
import SettingsRow from '../SettingsRow.vue';
import SelectInput from '@/components/common/SelectInput.vue';

const settingsStore = useSettingsStore();
const { save } = useSettingsSave();
</script>

<template>
    <div>
        <SettingsRow
            :label="$t('settings.ide_handler')"
            :hint="$t('settings.hints.ide_handler')"
        >
            <div class="w-52 max-w-full">
                <SelectInput
                    v-model="settingsStore.settings.ide_handler"
                    @change="save()"
                >
                    <option
                        v-for="(value, key) in settingsStore.ideHandlerOptions"
                        :value="key"
                    >
                        {{ value }}
                    </option>
                </SelectInput>
            </div>
        </SettingsRow>

        <SettingsRow
            :label="$t('settings.show_ssh_button')"
            :divider="false"
        >
            <input
                type="checkbox"
                class="toggle toggle-sm toggle-accent"
                :aria-label="$t('settings.show_ssh_button')"
                v-model="settingsStore.settings.show_ssh_button"
                @change="save()"
            />
        </SettingsRow>
    </div>
</template>
