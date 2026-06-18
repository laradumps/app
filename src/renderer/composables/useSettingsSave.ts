import { useSettingsStore } from '@/store/settings';
import { useToastStore } from '@/store/toast';
import { useI18n } from 'vue-i18n';

/**
 * Shared persistence helper for the settings panels.
 * Persists the current settings and surfaces the "changes saved" toast,
 * so each panel doesn't have to repeat the store + toast wiring.
 */
export function useSettingsSave() {
    const settingsStore = useSettingsStore();
    const toast = useToastStore();
    const { t } = useI18n();

    const save = async () => {
        await settingsStore.update();
        toast.show(t('settings.changes_saved'), 'success');
    };

    return { save };
}
