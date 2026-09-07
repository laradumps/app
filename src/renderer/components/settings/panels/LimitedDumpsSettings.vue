<script setup lang="ts">
import { useSettingsStore } from '@/store/settings';
import { useSettingsSave } from '@/composables/useSettingsSave';
import SettingsRow from '../SettingsRow.vue';

const settingsStore = useSettingsStore();
const { save } = useSettingsSave();
</script>

<template>
    <div>
        <SettingsRow :label="$t('settings.dumps')">
            <input
                type="number"
                class="input input-bordered input-sm w-52"
                v-model="settingsStore.settings.limit_dumps"
                @change="save()"
            />
        </SettingsRow>

        <SettingsRow :label="$t('settings.laravel_queries')">
            <input
                type="number"
                class="input input-bordered input-sm w-52"
                v-model="settingsStore.settings.limit_laravel_queries"
                @change="save()"
            />
        </SettingsRow>

        <SettingsRow :label="$t('settings.laravel_logs')">
            <input
                type="number"
                class="input input-bordered input-sm w-52"
                v-model="settingsStore.settings.limit_laravel_logs"
                @change="save()"
            />
        </SettingsRow>

        <SettingsRow :label="$t('settings.laravel_jobs')">
            <input
                type="number"
                class="input input-bordered input-sm w-52"
                v-model="settingsStore.settings.limit_laravel_jobs"
                @change="save()"
            />
        </SettingsRow>

        <SettingsRow
            :label="$t('settings.tail_log_max_size')"
            :hint="$t('settings.tail_log_max_size_hint')"
        >
            <input
                type="number"
                min="1"
                class="input input-bordered input-sm w-52"
                v-model.number="settingsStore.settings.tail_log_max_size_mb"
                @change="save()"
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
                class="input input-bordered input-sm w-52"
                :disabled="!settingsStore.settings.memory_guard_enabled"
                v-model.number="settingsStore.settings.memory_soft_mb"
                @change="save()"
            />
        </SettingsRow>

        <SettingsRow
            :label="$t('settings.memory_hard_mb')"
            :divider="false"
        >
            <input
                type="number"
                min="50"
                class="input input-bordered input-sm w-52"
                :disabled="!settingsStore.settings.memory_guard_enabled"
                v-model.number="settingsStore.settings.memory_hard_mb"
                @change="save()"
            />
        </SettingsRow>
    </div>
</template>
