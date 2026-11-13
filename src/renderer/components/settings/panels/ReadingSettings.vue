<script setup lang="ts">
import { useSettingsStore } from '@/store/settings';
import { useSettingsSave } from '@/composables/useSettingsSave';
import SettingsRow from '../SettingsRow.vue';

const settingsStore = useSettingsStore();
const { save } = useSettingsSave();

const toggles = ['show_variable_type', 'show_context', 'grouped_by_time'] as const;
const hinted: string[] = ['show_context', 'grouped_by_time'];
</script>

<template>
    <div>
        <SettingsRow
            v-for="(key, index) in toggles"
            :key="key"
            :label="$t(`settings.${key}`)"
            :hint="hinted.includes(key) ? $t(`settings.hints.${key}`) : ''"
            :divider="index < toggles.length - 1"
        >
            <input
                type="checkbox"
                class="toggle toggle-sm toggle-accent"
                :aria-label="$t(`settings.${key}`)"
                v-model="settingsStore.settings[key]"
                @change="save()"
            />
        </SettingsRow>
    </div>
</template>
