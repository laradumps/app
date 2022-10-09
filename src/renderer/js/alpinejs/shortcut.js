import { ipcRenderer } from 'electron';

export default () => ({
    shortcuts: [],
    init() {
        this.shortcuts = [
            { name: 'Test' },
            { name: 'Test 2' },
        ];
    },
    close() {
        ipcRenderer.send('main:close-shortcut-window');
    },
});
