<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSettingsStore } from '@/store/settings';
import { useSettingsSave } from '@/composables/useSettingsSave';
import { DEFAULT_SETTINGS } from '@/default-settings';
import SettingsRow from '../SettingsRow.vue';
import SegmentedInput from '@/components/common/SegmentedInput.vue';

const settingsStore = useSettingsStore();
const { save } = useSettingsSave();
const { t } = useI18n();

type NumericSetting =
    | 'limit_dumps'
    | 'limit_laravel_queries'
    | 'limit_laravel_logs'
    | 'limit_laravel_jobs'
    | 'tail_log_max_size_mb'
    | 'memory_soft_mb'
    | 'memory_hard_mb';

const limits = computed<{ key: NumericSetting; label: string }[]>(() => [
    { key: 'limit_dumps', label: t('settings.dumps') },
    { key: 'limit_laravel_queries', label: t('settings.limit_queries') },
    { key: 'limit_laravel_logs', label: t('settings.limit_logs') },
    { key: 'limit_laravel_jobs', label: t('settings.limit_jobs') }
]);

const dumpOrderOptions = computed(() => ({
    normal: t('settings.newest_first'),
    reversed: t('settings.oldest_first')
}));

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
        <SettingsRow
            :label="$t('settings.keep_per_view')"
            :hint="$t('settings.hints.keep_per_view')"
        >
            <div class="grid grid-cols-2 gap-2 w-64">
                <label
                    v-for="limit in limits"
                    :key="limit.key"
                    class="input input-bordered input-sm w-full"
                >
                    <span class="text-base-content/60 text-xs">{{ limit.label }}</span>
                    <input
                        type="number"
                        min="1"
                        max="10000"
                        class="min-w-0 flex-1 text-right font-mono"
                        v-model.number="settingsStore.settings[limit.key]"
                        @change="saveNumber($event, limit.key)"
                    />
                </label>
            </div>
        </SettingsRow>

        <SettingsRow
            :label="$t('settings.tail_log_max_size')"
            :hint="$t('settings.tail_log_max_size_hint')"
        >
            <input
                type="number"
                min="1"
                max="1024"
                class="input input-bordered input-sm w-28 text-right font-mono"
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

        <SettingsRow
            v-if="settingsStore.settings.memory_guard_enabled"
            :label="$t('settings.memory_soft_mb')"
        >
            <input
                type="number"
                min="50"
                max="16384"
                class="input input-bordered input-sm w-28 text-right font-mono"
                v-model.number="settingsStore.settings.memory_soft_mb"
                @change="saveNumber($event, 'memory_soft_mb')"
            />
        </SettingsRow>

        <SettingsRow
            v-if="settingsStore.settings.memory_guard_enabled"
            :label="$t('settings.memory_hard_mb')"
        >
            <input
                type="number"
                min="50"
                max="16384"
                class="input input-bordered input-sm w-28 text-right font-mono"
                v-model.number="settingsStore.settings.memory_hard_mb"
                @change="saveNumber($event, 'memory_hard_mb')"
            />
        </SettingsRow>

        <SettingsRow :label="$t('settings.dump_order')">
            <SegmentedInput
                v-model="settingsStore.settings.dump_order"
                :label="$t('settings.dump_order')"
                :options="dumpOrderOptions"
                @change="save()"
            />
        </SettingsRow>

        <SettingsRow
            :label="$t('settings.scroll_direction')"
            :hint="$t('settings.hints.scroll_direction')"
            :divider="false"
        >
            <SegmentedInput
                v-model="settingsStore.settings.scroll_direction"
                :label="$t('settings.scroll_direction')"
                :options="settingsStore.scrollDirection"
                @change="save()"
            />
        </SettingsRow>
    </div>
</template>
