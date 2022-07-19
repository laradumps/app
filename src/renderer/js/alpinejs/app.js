import { ipcRenderer, shell } from 'electron';
import storage from 'electron-json-storage';
import os from 'os';
import * as Console from 'console';
import supportZoom from '@/js/zoom';
import dragdropHandler from '@/js/draganddrop';
import { filterScreen, filterComponentScreen } from '@/js/filterScreen';
import searchableTable from '@/js/searchableTable';

const { clipboard } = require('electron');

const welcomeHtml = `
    <!-- debug -->
    <div id="debug"></div>
    <div class="overflow-auto dark:bg-slate-900 overflow-auto">
        <div x-ref="filterComponent" class="hidden relative px-3 mb-3 rounded-md shadow-smw w-full">
               <div class="absolute inset-y-0 left-0 ml-3 p-2 flex items-center pointer-events-none text-slate-400">
                    <svg class="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
               </div>
               <input id="search" 
                      x-on:keyup="searchComponents()" type="text" autocomplete="off"
                      class="p-2 placeholder-gray-400 dark:bg-slate-800 dark:text-slate-400 dark:placeholder-gray-500 border border-slate-300 focus:ring-slate-600 focus:border-slate-500 dark:border-slate-600 form-input block w-full sm:text-sm rounded-md transition ease-in-out duration-100 focus:outline-none shadow-sm pl-8">
        </div>
        <div style="height: calc(100vh - 140px)" class="px-3 right-0 mb-[4rem] dark:bg-slate-900" id="debug">
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
                        <button title="Click to copy" x-on:click="clipboard('composer require --dev laradumps/laradumps', 'copyComposerIcon')">
                           <div class="flex justify-between dark:text-slate-700">
                              <span>composer require laradumps/laradumps --dev</span>
                              <div title="Click to copy">
                                 <svg class="w-5 h-5 hover:text-slate-800" fill="none"
                                    x-ref="copyComposerIcon"
                                    viewBox="0 0 24 24" stroke="#485569">
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
                     <button title="Click to copy" x-on:click="clipboard('php artisan ds:init', 'copyArtisanIcon')">
                           <div class="flex justify-between">
                              <span>php artisan ds:init</span>
                              <div title="Click to copy">
                                 <svg class="w-5 h-5 hover:text-slate-800" fill="none"
                                    x-ref="copyArtisanIcon"
                                    viewBox="0 0 24 24" stroke="#485569">
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
                     <button title="Click to copy" x-on:click="clipboard('ds(\\'Hello World\\');', 'copyDsIcon')">
                           <div class="flex justify-between">
                              <span>ds('Hello world!')</span>
                              <div title="Click to copy">
                                 <svg class="w-5 h-5 hover:text-slate-800" fill="none"
                                    x-ref="copyDsIcon"
                                    viewBox="0 0 24 24" stroke="#485569">
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
               <div class="mt-8 font-light" x-on:click="openLink('https://laradumps.dev')">📚
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
    activeScreen: 'laraDumpsScreen-screen 1',
    defaultScreenName: null,
    screenList: [],
    dumpBatch: [],
    filesBatch: [],
    main: null,
    rendered: false,
    savedDumpsWindow: false,
    totalPayloadSaved: [],
    dragdropEnabled: false,
    bannedComponents: [],
    clipboard(text, el = null) {
        clipboard.writeText(text);

        if (!el) {
            return;
        }

        const icon = this.$refs[el];

        icon.style.stroke = '#FAC429';

        setTimeout(() => icon.style.stroke = '#485569', 500);
    },
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

        ipcRenderer.on('screen', (event, { content }) => {
            this.maximizeApp();

            const resolvePayloadScreen = () => {
                const lastIndex = this.screenList[this.screenList.length - 1].index + 1;

                const screenHtml = content.content.screenHtml ?? this.defaultScreenName;
                const { screenName, classAttr, raiseIn } = content.content;

                this.screenList.forEach((element) => element.active = element.label === screenHtml);

                const btnScreenItem = {
                    index: lastIndex,
                    screenHtml,
                    classAttr,
                    active: true,
                    screenName,
                };

                if (this.screenList.filter((screen) => screen.screenName === (content.content.screenName ?? this.defaultScreenName))
                    .length === 0) {
                    this.screenList.push(btnScreenItem);
                }

                this.$dispatch('dumper:screen', btnScreenItem);

                this.filterScreen(screenHtml);

                this.activeScreen = screenHtml;

                return { screenHtml, screenName, raiseIn };
            };

            const payloadScreen = resolvePayloadScreen();

            if (payloadScreen.raiseIn > 0) {
                setTimeout(() => {
                    this.filterScreen(payloadScreen.screenName);
                    this.activeScreen = payloadScreen.screenName;
                }, payloadScreen.raiseIn);
            } else {
                this.filterScreen(payloadScreen.screenName);
                this.activeScreen = payloadScreen.screenName;
            }
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
            this.maximizeApp(true);
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
            screenHtml: this.defaultScreenName,
            screenName: this.defaultScreenName,
            active: true,
            type: null,
        });
    },
    maximizeApp(autoInvoke) {
        if (autoInvoke) {
            ipcRenderer.send('main:show');
        }
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

        this.removeLivewirePropertiesCard();
    },
    addLivewirePropertiesCard() {
        this.$refs.body.classList.add('flex', 'mr-3', 'h-full');
        this.$refs.livewire.classList.remove('hidden');
        this.$refs.main.classList.add('w-1/2');
        if (this.$refs.filterComponent != null) {
            this.$refs.filterComponent.classList.remove('hidden');
        }
    },
    removeLivewirePropertiesCard() {
        this.$refs.body.classList.remove('flex', 'mr-3', 'h-full');
        this.$refs.livewire.classList.add('hidden');
        this.$refs.main.classList.remove('w-1/2');
        if (this.$refs.filterComponent != null) {
            this.$refs.filterComponent.classList.add('hidden');
        }
    },
    clearScreen() {
        const active = this.screenList.filter((element) => element.active)[0];

        const elements = document.getElementsByClassName(`laraDumpsScreen-${active.screenName}`);

        [...elements].map((el) => el.remove());

        this.screenList = this.screenList.filter((element) => element.screenName !== active.screenName);

        this.filterScreen('screen 1');
        this.activeScreen = this.defaultScreenName;
    },
    dispatchDump(type, content) {
        if (!this.bannedComponents.includes(content.id)) {
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

            if (type === 'livewire') {
                this.addLivewirePropertiesCard();
            } else {
                this.removeLivewirePropertiesCard();
                this.$nextTick(() => {
                    document.getElementById('output').scrollIntoView({
                        behavior: 'smooth',
                    });
                });
            }

            const autoInvokeApp = typeof content.meta === 'object' ? content.meta.auto_invoke_app : true;

            this.maximizeApp(autoInvokeApp);

            this.filterScreen(this.activeScreen);
            this.activeScreen = this.defaultScreenName;
        }
    },
    saveDumps(payload) {
        payload.content = JSON.parse(new Buffer(payload.content, 'base64').toString());
        payload.ideHandle = JSON.parse(new Buffer(payload.ideHandle, 'base64').toString());

        ipcRenderer.send('main:save-dumps', payload);
        setTimeout(() => this.savedDumps(), 500);
    },
    banComponent(component) {
        this.bannedComponents.push(component);
        document.getElementById(component).remove();
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
    handleLivewireDumpCard(notificationId) {
        this.$dispatch('handleLivewireDumpCard', notificationId);
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
        if (screen === 'Livewire') {
            this.addLivewirePropertiesCard();
        } else {
            this.removeLivewirePropertiesCard();
        }

        filterScreen(screen);
        this.screenList.forEach((element) => {
            element.active = element.screenName === screen;
        });
        this.activeScreen = screen;
    },
    searchableTable(id) {
        searchableTable(id);
    },
    searchComponents() {
        const input = document.getElementById('search');
        const filter = input.value.toString();
        filterComponentScreen(filter);
    },
});
