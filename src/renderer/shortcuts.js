import { ipcRenderer } from 'electron';
import hotkeys from 'hotkeys-js';

let InputElement = null;

// ** Structure for inputs **/
const shortCutAll = [...document.getElementsByClassName('js-shortcut')];
const saveBtnAll = [...document.getElementsByClassName('js-save')];

shortCutAll.forEach((input) => input.addEventListener('click', (event) => {
    InputElement = event.target;
}, false));

shortCutAll.forEach((input) => input.addEventListener('blur', () => {
    InputElement = null;
}, false));

// ** Save button **/
saveBtnAll.forEach((button) => button.addEventListener(
    'click',
    (event) => {
        const input = event.target.previousSibling.previousSibling;

        ipcRenderer.send('main:set-shortcut', {
            shortcut: `ds_shortcut_${input.name}`,
            keys: input.value.toElectronFormat(),
        });

        InputElement = null;
    },
    false,
));

//* * Detected key pressed **/
hotkeys('*', () => {
    const codes = hotkeys.getPressedKeyCodes();
    const keys = hotkeys.getPressedKeyString().join('+');

    if (typeof InputElement !== 'undefined' && InputElement !== null) {
        InputElement.value = keys.beautifyShortcut();
    }
});

//* * Convert shortcuts to Electron format **/
Object.defineProperty(String.prototype, 'beautifyShortcut', {
    value() {
        if (process.platform === 'darwin') {
            return this.replace('CommandOrControl', '⌘')
                .replace('Shift', '⇧')
                .replace('Option', '⌥');
        }
        return this.replace('CommandOrControl', '⊞')
            .replace('Shift', '⇧')
            .replace('Option', '⌥');
    },
});

Object.defineProperty(String.prototype, 'toElectronFormat', {
    value() {
        return this.replace('', 'CommandOrControl')
            .replace('⌘', 'CommandOrControl')
            .replace('⇧', 'Shift')
            .replace('⌥', 'Option');
    },
});

// ** Loading existing shortcuts  **/
ipcRenderer.on('shortcuts:list', (event, arg) => {
    const shortcut = arg.shortcut.replace('ds_shortcut_', '');

    try {
        if (document.getElementById(shortcut) !== null) {
            document.getElementById(shortcut).value = arg.keys.beautifyShortcut();
        }
    } catch (err) {
        console.log('Error: ', err);
    }
});
