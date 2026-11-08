<script setup lang="ts">
import { useSettingsStore } from '@/store/settings';
import { useSettingsSave } from '@/composables/useSettingsSave';
import SettingsRow from '../SettingsRow.vue';

const settingsStore = useSettingsStore();
const { save } = useSettingsSave();

const isMac = process.platform === 'darwin';

const onBadgeCountChange = () => {
    if (!settingsStore.settings.show_badge_count) {
        window.ipcRenderer.send('badge-icon.increment', { reset: true });
    }
    save();
};
</script>

<template>
    <div>
        <SettingsRow
            :label="$t('settings.show_badge_count')"
            :hint="$t('settings.hints.show_badge_count')"
            :divider="isMac"
        >
            <input
                type="checkbox"
                class="toggle toggle-sm toggle-accent"
                :aria-label="$t('settings.show_badge_count')"
                v-model="settingsStore.settings.show_badge_count"
                @change="onBadgeCountChange()"
            />
        </SettingsRow>

        <SettingsRow
            v-if="isMac"
            :label="$t('settings.show_dump_notifications')"
            :divider="false"
        >
            <input
                type="checkbox"
                class="toggle toggle-sm toggle-accent"
                :aria-label="$t('settings.show_dump_notifications')"
                v-model="settingsStore.settings.show_dump_notifications"
                @change="save()"
            />
        </SettingsRow>
    </div>
</template>
