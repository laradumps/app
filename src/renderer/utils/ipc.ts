import type { Ref } from 'vue';

export function checkApplicationPath(
    content: { application_path?: string },
    currentPath: Ref<string>
): void {
    if (content.application_path && currentPath.value !== content.application_path) {
        window.ipcRenderer.send('storage.check', {
            applicationPath: content.application_path
        });
        currentPath.value = content.application_path;
    }
}

export function sendToScreenWindow(
    screen: string,
    data: Record<string, any>
): void {
    window.ipcRenderer.send('send-screen-window-update', {
        screen,
        ...data
    });
}

export function openNewScreenWindow(
    screenStore: { hidden: (name: string) => void },
    screen: string,
    data: Record<string, any>
): void {
    screenStore.hidden(screen);

    window.ipcRenderer.send('screen-window:show', {
        screen,
        ...data,
        position: {}
    });
}
