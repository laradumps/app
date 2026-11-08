import { useI18n } from 'vue-i18n';
import { ipc } from '@/ipc/client';

export function useConfirm() {
    const { t } = useI18n();

    return (title: string, message: string): Promise<boolean> =>
        new Promise((resolve) => {
            ipc.once('main:dialog-choice', (_event, choice: number) => resolve(choice === 1));

            ipc.send('main:dialog', { buttons: [t('settings.cancel'), t('yes')], title, message });
        });
}
