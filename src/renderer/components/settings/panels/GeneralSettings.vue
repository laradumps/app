<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useSettingsStore } from '@/store/settings';
import { useI18nStore } from '@/store/i18n';
import { useSettingsSave } from '@/composables/useSettingsSave';
import SettingsRow from '../SettingsRow.vue';
import SelectInput from '@/components/common/SelectInput.vue';

const settingsStore = useSettingsStore();
const localeStore = useI18nStore();
const { locale } = useI18n({ useScope: 'global' });
const { save } = useSettingsSave();

const saveLanguage = async () => {
    localeStore.set(settingsStore.settings.language);
    locale.value = localeStore.value;
    await save();
};

const saveAutoLaunch = async () => {
    window.ipcRenderer.send('set-auto-launch', { value: settingsStore.settings.auto_launch });
    await save();
};
</script>

<template>
    <div>
        <SettingsRow :label="$t('settings.app_version')">
            <span class="text-sm text-base-content/60">{{ settingsStore.settings.version ?? '-' }}</span>
        </SettingsRow>

        <SettingsRow :label="$t('settings.language')">
            <div class="w-52">
                <SelectInput
                    v-model="settingsStore.settings.language"
                    @change="saveLanguage()"
                >
                    <option
                        v-for="(value, key) in settingsStore.languageOptions"
                        :value="key"
                    >
                        {{ value }}
                    </option>
                </SelectInput>
            </div>
        </SettingsRow>

        <SettingsRow :label="$t('settings.ide_handler')">
            <div class="w-52">
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

        <SettingsRow :label="$t('settings.check_for_updates')">
            <div class="w-52">
                <SelectInput
                    v-model="settingsStore.settings.check_for_updates"
                    @change="save()"
                >
                    <option
                        v-for="(value, key) in settingsStore.checkForUpdateOptions"
                        :value="key"
                    >
                        {{ value }}
                    </option>
                </SelectInput>
            </div>
        </SettingsRow>

        <SettingsRow
            :label="$t('settings.auto_launch')"
            :divider="false"
        >
            <div class="w-52">
                <SelectInput
                    v-model="settingsStore.settings.auto_launch"
                    @change="saveAutoLaunch()"
                >
                    <option
                        v-for="(value, key) in settingsStore.autoLaunchOptions"
                        :value="key"
                    >
                        {{ value }}
                    </option>
                </SelectInput>
            </div>
        </SettingsRow>
    </div>
</template>
