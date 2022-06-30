import { ipcRenderer, shell } from 'electron';
import storage from 'electron-json-storage';
import os from 'os';
import supportZoom from '@/js/zoom';
import dragdropHandler from '@/js/draganddrop';

const welcomeHtml = `
    <!-- debug -->
    <div id="debug"></div>
    <div class="overflow-auto dark:bg-slate-900">
        <div class="left-[4rem] px-3 right-0 overflow-auto mb-[4rem] dark:bg-slate-900" id="debug">
            
            <div x-show="savedDumpsWindow && dumpBatch.length === 0" class="w-full h-full font-semibold items-center justify-center p-4 text-slate-500 text-sm text-center space-y-5">   
                <div class="rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 p-4">
                  <div class="flex">
                    <div class="flex-shrink-0">
                      <svg class="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                      </svg>
                    </div>
                    <div class="ml-3 flex-1 md:flex md:justify-between">
                      <p class="text-sm text-blue-700 dark:text-blue-300">... Nothing here for now</p>
                    </div>
                  </div>
                </div>  
            </div>
           
            <!-- welcome page -->
            <div x-show="!savedDumpsWindow" x-ref="welcome" class="shadow-lg w-full p-4 mb-16 text-sm bg-white rounded-sm dark:text-slate-300 dark:bg-slate-700 leading-6">
               <h3 class="mb-8 text-xl font-bold"><span class="text-lg text-blue-600 dark:text-slate-300">👋</span> Hello dev,</h3>
               <span class="font-semibold text-lg">Welcome to LaraDumps!</span>
               <div class="mt- text-slate-600 dark:text-slate-300">
                  <div class="pt-4"><span class="underline">Quick start</span></div>
                  <div class="mt-6">
                     <span>1. Install LaraDumps, run </span>
                     <span class="p-1.5 bg-slate-200 text-md rounded mr-1 cursor-pointer leading-normal">
                        <button title="Click to copy" x-on:click="showCopiedComposer = true; setTimeout(() => showCopiedComposer = false, 500); $clipboard(copyComposer)">
                           <div class="flex justify-between dark:text-slate-700">
                              <span>composer require laradumps/laradumps --dev</span>
                              <div title="Click to copy">
                                 <svg class="w-5 h-5 hover:text-slate-800" fill="none"
                                    viewBox="0 0 24 24" x-bind:stroke="showCopiedComposer ? '#FAC429' : '#485569'">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                       d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                                 </svg>
                              </div>
                           </div>
                        </button>
                     </span>
                  </div>
                  <div class="mt-5">
                     <span>2. Configure your Laravel project, execute</span> 
                     <span  class="p-1.5 text-slate-600 bg-slate-200 text-md rounded mr-1 cursor-pointer leading-normal">
                     <button title="Click to copy" x-on:click="showCopiedArtisan = true; setTimeout(() => showCopiedArtisan = false, 500); $clipboard(copyArtisan)">
                           <div class="flex justify-between">
                              <span>php artisan ds:init</span>
                              <div title="Click to copy">
                                 <svg class="w-5 h-5 hover:text-slate-800" fill="none"
                                    viewBox="0 0 24 24" x-bind:stroke="showCopiedArtisan ? '#FAC429' : '#485569'">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                       d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                                 </svg>
                              </div>
                           </div>
                        </button>
                     </span>
                  </div>
                  <div class="mt-5">
                     <span>3. Add</span>
                     <span  class="p-1.5 text-slate-600 bg-slate-200 text-md rounded mr-1 cursor-pointer leading-normal">
                     <button title="Click to copy" x-on:click="showCopiedDs = true; setTimeout(() => showCopiedDs = false, 500); $clipboard(copyDs)">
                           <div class="flex justify-between">
                              <span>ds('Hello world!')</span>
                              <div title="Click to copy">
                                 <svg class="w-5 h-5 hover:text-slate-800" fill="none"
                                    viewBox="0 0 24 24" x-bind:stroke="showCopiedDs ? '#FAC429' : '#485569'">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                       d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                                 </svg>
                              </div>
                           </div>
                        </button>
                     </span>
                     <span>somewhere in your code.</span>
                  </div>
                  <div class="mt-5">4. Run your application and see what happens here! 😎</div>
               </div>
               <div class="mt-8 font-light" x-on:click="openLink('https://laradumps.gitbook.io/laradumps')">📚
                  Check our <span class="text-blue-500 underline cursor-pointer dark:text-blue-300">documentation</span> for more information.
               </div>
               <div class="mt-6 font-light" x-on:click="openLink('https://github.com/laradumps/laradumps')">⭐
                  Enjoying LaraDumps? Please consider <span class="text-blue-500 underline cursor-pointer dark:text-blue-300"> starring our repository</span>!
               </div>
            </div>        
        </div>
    </div>`;

export default () => ({
    label: 'laradumps',
    dialog: {
        open: false, title: null, description: null, button: 'Ok',
    },
    dark: false,
    isAlwaysOnTop: false,
    isCollapsedAll: false,
    collapsableElementsCount: 0,
    collapsableElements: [],
    privacyMode: false,
    privacyElements: [],
    ideHandle: null,
    activeScreen: 'screen 1',
    defaultScreenName: null,
    screenList: [],
    dumpBatch: [],
    filesBatch: [],
    copyComposer: 'composer require --dev laradumps/laradumps',
    copyDs: 'ds(\'Hello World\')',
    copyArtisan: 'php artisan ds:init',
    showCopiedComposer: false,
    showCopiedDs: false,
    showCopiedArtisan: false,
    main: null,
    rendered: false,
    savedDumpsWindow: false,
    totalPayloadSaved: [],
    dragdropEnabled: false,
    init() {
        supportZoom();

        this.dark = window.Alpine.store('darkMode').dark;

        this.$watch('dark', () => window.Alpine.store('darkMode').toggle());

        this.main = welcomeHtml;

        ipcRenderer.send('main:get-app-version');

        this.defaultScreen();

        storage.setDataPath(os.tmpdir());

        storage.keys(async (error, keys) => {
            if (error) throw error;

            this.totalPayloadSaved = keys.length;
        });

        this.$watch('collapsableElementsCount', (value) => {
            if (value === 0) {
                this.isCollapsedAll = true;
                this.$refs.togglePrivacyMode.setAttribute('class', 'hidden');

                return;
            }
            this.isCollapsedAll = false;
            this.$refs.togglePrivacyMode.setAttribute('class', 'block justify-center cursor-pointer text-gray-900 group flex items-center p-2');
        });

        ipcRenderer.on('screen', (event, arg) => {
            this.maximizeApp();
            const lastIndex = this.screenList[this.screenList.length - 1].index + 1;

            const screen = arg.content.content.screen ?? this.defaultScreenName;
            const classAttr = arg.content.content.classAttr ?? [];

            this.screenList.forEach((element) => element.active = element.label === screen);

            const btnScreenItem = {
                index: lastIndex,
                label: screen,
                classAttr,
                active: true,
            };

            if (this.screenList.filter((screen) => screen.label === (arg.content.content.screen ?? this.defaultScreenName))
                .length === 0) {
                this.screenList.push(btnScreenItem);
            }

            this.$dispatch('dumper:screen', btnScreenItem);

            this.filterScreen(screen);

            this.activeScreen = screen;
        });

        ipcRenderer.on('preload:server-failed', (event, arg) => {
            this.dialog.title = arg.dialogTitle;
            this.dialog.description = arg.dialogDescription;
            this.dialog.open = true;
        });

        ipcRenderer.on('ipc:package-down', (event, arg) => {
            this.dialog.title = arg.dialogTitle;
            this.dialog.description = arg.dialogDescription;
            this.dialog.open = true;
        });

        ipcRenderer.on('main:update-failed', (event, arg) => {
            this.dialog.title = arg.dialogTitle;
            this.dialog.description = arg.dialogDescription;
            this.dialog.open = true;
        });

        ipcRenderer.on('diff', (event, arg) => this.dispatchDump('diff', arg.content));

        ipcRenderer.on('dump', (event, arg) => this.dispatchDump('dump', arg.content));

        ipcRenderer.on('color', (event, arg) => this.dispatchDump('color', arg.content));

        ipcRenderer.on('label', (event, arg) => this.dispatchDump('label', arg.content));

        ipcRenderer.on('validate', (event, arg) => {
            switch (arg.content.content.type) {
            case 'json':
                this.dispatchDump('json', arg.content);
                break;
            case 'contains':
                this.dispatchDump('contains', arg.content);
                break;
            }
        });

        ipcRenderer.on('queries', (event, arg) => this.dispatchDump('queries', arg.content));

        ipcRenderer.on('query', (event, arg) => this.dispatchDump('query', arg.content));

        ipcRenderer.on('log', (event, arg) => this.dispatchDump('log', arg.content));

        ipcRenderer.on('table', (event, arg) => this.dispatchDump('table', arg.content));

        ipcRenderer.on('model', (event, arg) => this.dispatchDump('model', arg.content));

        ipcRenderer.on('livewire', (event, arg) => this.dispatchDump('livewire', arg.content));

        ipcRenderer.on('clear', () => this.clear());

        ipcRenderer.on('events', (event, arg) => this.dispatchDump('events', arg.content));

        ipcRenderer.on('main:app-version', (event, arg) => {
            document.title = `LaraDumps - ${arg.version}`;
        });

        ipcRenderer.on('main:message', (event, arg) => {
            if (arg.updater === 'downloading') {
                document.title = 'Downloading latest version ...';
            }
        });

        ipcRenderer.on('app:load-all-saved-payload', async () => {
            await this.loadAllSavedPayload();
        });

        window.addEventListener('app:resolve-toggle-buttons', () => {
            const attrClass = 'justify-center cursor-pointer text-gray-900 group flex items-center p-2 block';

            this.$refs.togglePrivacyMode.setAttribute('class', attrClass);
            this.$refs.toggleCollapseAll.setAttribute('class', attrClass);
        });

        this.$nextTick(() => this.rendered = true);
    },
    loadAllSavedPayload(clear = true) {
        this.savedDumpsWindow = true;
        document.title = 'LaraDumps - Saved';

        if (clear) {
            this.clear();
        }

        storage.setDataPath(os.tmpdir());
        let data;

        storage.keys(async (error, keys) => {
            if (error) throw error;
            // eslint-disable-next-line no-restricted-syntax
            for (const key of keys) {
                // eslint-disable-next-line no-await-in-loop
                data = await storage.getSync(key);
                this.dispatchDump(data.type, data);
            }
        });
    },
    savedDumps() {
        ipcRenderer.send('main:open-saved-dumps');
    },
    enableDragAndDrop() {
        const collapsable = document.getElementsByClassName('collapsable');

        [...collapsable].map((el) => {
            if (el.getAttribute('draggable') === 'true') {
                el.setAttribute('draggable', 'false');
                this.dragdropEnabled = false;
            } else {
                el.setAttribute('draggable', 'true');
                this.dragdropEnabled = true;
            }
        });

        if (this.dragdropEnabled) {
            dragdropHandler();
        }
    },
    defaultScreen() {
        this.defaultScreenName = 'screen 1';
        this.screenList = [];
        this.screenList.push({
            index: 0,
            classAttr: '',
            label: this.defaultScreenName,
            active: true,
        });
    },
    maximizeApp() {
        ipcRenderer.send('main:show');
    },
    openLink(link) {
        shell.openExternal(link);
    },
    initCollapsableElements() {
        this.collapsableElements = [...document.getElementsByClassName('collapsable')];
        this.collapsableElementsCount = this.collapsableElements.length;
    },
    clear() {
        this.dumpBatch = [];
        this.filesBatch = [];
        this.defaultScreen();
        this.$refs.welcome.setAttribute('class', 'block w-auto mx-5 text-sm p-6 shadow bg-white rounded dark:text-slate-300 dark:bg-slate-700');
        this.$refs.main.innerHTML = welcomeHtml;
    },
    dispatchDump(type, content) {
        this.$dispatch(`dumper:${type}`, content);

        const { ideHandle } = content;

        this.dumpBatch.push({
            id: content.id,
            ideHandle,
            type,
        });

        const exists = this.filesBatch.filter((file) => file.ideHandle.path === ideHandle.path)
            .length > 0;

        if (!exists) {
            this.filesBatch.push({
                active: false,
                ideHandle,
            });
        }

        const scrollExceptTypes = [
            'livewire',
        ];

        if (!type.includes(scrollExceptTypes)) {
            this.$nextTick(() => {
                document.getElementById('output').scrollIntoView({
                    behavior: 'smooth',
                });
            });
        }

        this.maximizeApp();
        this.filterScreen(this.activeScreen);
        this.activeScreen = this.defaultScreenName;
    },
    saveDumps(payload) {
        payload.content = JSON.parse(new Buffer(payload.content, 'base64').toString());
        payload.ideHandle = JSON.parse(new Buffer(payload.ideHandle, 'base64').toString());

        ipcRenderer.send('main:save-dumps', payload);
        setTimeout(() => this.savedDumps(), 500);
    },
    removePayload(payload) {
        storage.setDataPath(os.tmpdir());
        storage.remove(payload.id, (error) => {
            if (error) throw error;
        });

        document.getElementById(payload.id).remove();
        this.loadAllSavedPayload(false);
    },
    activeFileFilter(file) {
        this.filesBatch.map((file) => file.active = false);
        file.active = true;
    },
    privacyButtonColor() {
        if (this.dark) {
            return (this.privacyMode ? '#53637a' : '#64748b');
        }
        return (this.privacyMode ? '#9dabbf' : '#64748b');
    },
    filesColor() {
        return this.dark ? '#6B7280' : '#a4a3a3';
    },
    collapseAllButtonColor() {
        if (this.dark) {
            return (this.isAlwaysOnTop ? '#a4b0c2' : '#64748b');
        }
        return (this.isAlwaysOnTop ? '#424e61' : '#64748b');
    },
    alwaysOnTopColor() {
        if (this.dark) {
            return (this.isAlwaysOnTop ? '#a4b0c2' : '#64748b');
        }
        return (this.isAlwaysOnTop ? '#424e61' : '#64748b');
    },
    togglePrivacyMode() {
        this.privacyMode = !this.privacyMode;
        this.privacyElements = document.getElementsByClassName('privacyMode');

        [...this.privacyElements].map((el) => el.classList.toggle('hidden', this.privacyMode));
    },
    toggleCollapse() {
        this.count = 1;
        this.open = !this.open;
        // eslint-disable-next-line no-unused-expressions
        !this.open ? this.collapsableElementsCount -= 1 : this.collapsableElementsCount += 1;
    },
    toggleCollapseAll() {
        this.isCollapsedAll = !this.isCollapsedAll;
        this.collapsableElementsCount = (!this.isCollapsedAll) ? this.collapsableElements.length : 0;

        this.collapsableElements.map((el) => {
            el._x_dataStack[0].count = 1;
            el._x_dataStack[0].open = !this.isCollapsedAll;
        });
    },
    toggleAlwaysOnTop() {
        this.isAlwaysOnTop = !this.isAlwaysOnTop;

        ipcRenderer.send('main:toggle-always-on-top', this.isAlwaysOnTop);
    },
    filterScreen(screen) {
        let i;

        const x = document.getElementsByClassName('filterScreen');
        if (screen === 'all') screen = '';
        for (i = 0; i < x.length; i += 1) {
            this.removeClass(x[i], 'show');
            if (x[i].className.indexOf(screen) > -1) this.addClass(x[i], 'show');
        }

        this.screenList.forEach((element) => element.active = element.label === screen);
    },
    addClass(element, name) {
        let i;
        const arr1 = element.className.split(' ');
        const arr2 = name.split(' ');
        for (i = 0; i < arr2.length; i += 1) {
            if (arr1.indexOf(arr2[i]) === -1) {
                element.className += ` ${arr2[i]}`;
            }
        }
    },
    removeClass(element, name) {
        let i;
        const arr1 = element.className.split(' ');
        const arr2 = name.split(' ');
        for (i = 0; i < arr2.length; i += 1) {
            while (arr1.indexOf(arr2[i]) > -1) {
                arr1.splice(arr1.indexOf(arr2[i]), 1);
            }
        }
        element.className = arr1.join(' ');
    },
    searchTable(id) {
        let td; let cell; let i; let
            j;
        const input = this.$refs[`search-${id}`];
        const table = this.$refs[`table-${id}`];
        const filter = input.value.toUpperCase();
        const tr = table.getElementsByTagName('tr');
        // eslint-disable-next-line no-plusplus
        for (i = 1; i < tr.length; i++) {
            tr[i].style.display = 'none';

            td = tr[i].getElementsByTagName('td');
            // eslint-disable-next-line no-plusplus
            for (j = 0; j < td.length; j++) {
                cell = tr[i].getElementsByTagName('td')[j];
                if (cell) {
                    if (cell.innerHTML.toUpperCase().indexOf(filter) > -1) {
                        tr[i].style.display = '';
                        break;
                    }
                }
            }
        }
    },
});
