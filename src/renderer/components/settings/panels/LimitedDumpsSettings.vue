<script setup lang="ts">
import { useSettingsStore } from '@/store/settings';
import { useSettingsSave } from '@/composables/useSettingsSave';
import { DEFAULT_SETTINGS } from '@/default-settings';
import SettingsRow from '../SettingsRow.vue';

const settingsStore = useSettingsStore();
const { save } = useSettingsSave();

type NumericSetting =
    | 'limit_dumps'
    | 'limit_laravel_queries'
    | 'limit_laravel_logs'
    | 'limit_laravel_jobs'
    | 'tail_log_max_size_mb'
    | 'memory_soft_mb'
    | 'memory_hard_mb';

const saveNumber = (event: Event, key: NumericSetting) => {
    const input = event.target as HTMLInputElement;

    if (input.value !== '' && input.validity.valid) {
        save();
        return;
    }

    settingsStore.settings[key] = DEFAULT_SETTINGS[key];
    settingsStore.update();
};
</script>

<template>
    <div>
        <SettingsRow :label="$t('settings.dumps')">
            <input
                type="number"
                min="1"
                max="10000"
                class="input input-bordered input-sm w-52"
                v-model.number="settingsStore.settings.limit_dumps"
                @change="saveNumber($event, 'limit_dumps')"
            />
        </SettingsRow>

        <SettingsRow :label="$t('settings.laravel_queries')">
            <input
                type="number"
                min="1"
                max="10000"
                class="input input-bordered input-sm w-52"
                v-model.number="settingsStore.settings.limit_laravel_queries"
                @change="saveNumber($event, 'limit_laravel_queries')"
            />
        </SettingsRow>

        <SettingsRow :label="$t('settings.laravel_logs')">
            <input
                type="number"
                min="1"
                max="10000"
                class="input input-bordered input-sm w-52"
                v-model.number="settingsStore.settings.limit_laravel_logs"
                @change="saveNumber($event, 'limit_laravel_logs')"
            />
        </SettingsRow>

        <SettingsRow :label="$t('settings.laravel_jobs')">
            <input
                type="number"
                min="1"
                max="10000"
                class="input input-bordered input-sm w-52"
                v-model.number="settingsStore.settings.limit_laravel_jobs"
                @change="saveNumber($event, 'limit_laravel_jobs')"
            />
        </SettingsRow>

        <SettingsRow
            :label="$t('settings.tail_log_max_size')"
            :hint="$t('settings.tail_log_max_size_hint')"
        >
            <input
                type="number"
                min="1"
                max="1024"
                class="input input-bordered input-sm w-52"
                v-model.number="settingsStore.settings.tail_log_max_size_mb"
                @change="saveNumber($event, 'tail_log_max_size_mb')"
            />
        </SettingsRow>

        <SettingsRow
            :label="$t('settings.memory_guard')"
            :hint="$t('settings.memory_guard_hint')"
        >
            <input
                type="checkbox"
                class="toggle toggle-sm toggle-accent"
                v-model="settingsStore.settings.memory_guard_enabled"
                @change="save()"
            />
        </SettingsRow>

        <SettingsRow :label="$t('settings.memory_soft_mb')">
            <input
                type="number"
                min="50"
                max="16384"
                class="input input-bordered input-sm w-52"
                :disabled="!settingsStore.settings.memory_guard_enabled"
                v-model.number="settingsStore.settings.memory_soft_mb"
                @change="saveNumber($event, 'memory_soft_mb')"
            />
        </SettingsRow>

        <SettingsRow
            :label="$t('settings.memory_hard_mb')"
            :divider="false"
        >
            <input
                type="number"
                min="50"
                max="16384"
                class="input input-bordered input-sm w-52"
                :disabled="!settingsStore.settings.memory_guard_enabled"
                v-model.number="settingsStore.settings.memory_hard_mb"
                @change="saveNumber($event, 'memory_hard_mb')"
            />
        </SettingsRow>
    </div>
</template>
