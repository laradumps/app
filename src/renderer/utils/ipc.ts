import type { Ref } from 'vue';
import { ipc } from '@/ipc/client';

export function checkApplicationPath(content: { application_path?: string }, currentPath: Ref<string>): void {
    if (content.application_path && currentPath.value !== content.application_path) {
        ipc.send('storage.check', { applicationPath: content.application_path });
        currentPath.value = content.application_path;
    }
}

export function sendToScreenWindow(screen: string, data: Record<string, any>): void {
    ipc.send('send-screen-window-update', { screen, ...data });
}

export function openNewScreenWindow(
    screenStore: { hidden: (name: string) => void; markDetached: (name: string) => void },
    screen: string,
    data: Record<string, any>
): void {
    screenStore.hidden(screen);
    screenStore.markDetached(screen);
    ipc.send('screen-window:show', { screen, ...data, position: {} });
}
