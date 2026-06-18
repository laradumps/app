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

        <SettingsRow
            :label="$t('settings.laravel_jobs')"
            :divider="false"
        >
            <input
                type="number"
                class="input input-bordered input-sm w-52"
                v-model="settingsStore.settings.limit_laravel_jobs"
                @change="save()"
            />
        </SettingsRow>
    </div>
</template>
