import { ipcRenderer, shell } from 'electron';
import storage from 'electron-json-storage';
import os from 'os';
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
                      <p class="text-sm text-blue-700 dark:text-blue-300">There are no saved Dumps!</p>
                    </div>
                  </div>
                </div>  
            </div>
           
            <!-- welcome page -->
            <div x-show="!savedDumpsWindow" x-ref="welcome" class="select-none shadow-lg w-full p-4 mb-16 text-sm bg-white rounded-sm dark:text-slate-300 dark:bg-slate-700 leading-6">
               <h3 class="mb-8 text-xl font-bold"><span class="text-lg text-blue-600 dark:text-slate-300">👋</span> Hello dev,</h3>
               <span class="font-semibold text-lg">Welcome to LaraDumps!</span>
               <div class="mt- text-slate-600 dark:text-slate-300">
                  <div class="pt-4"><span class="underline">Quick start</span></div>
                  <div class="mt-6">
                     <span>1. Install LaraDumps, run </span>
                     <span class="p-1.5 bg-slate-200 text-md rounded mr-1 cursor-pointer leading-normal">
                        <button x-on:mouseenter="$title('Click to copy')" x-on:click="clipboard('composer require --dev laradumps/laradumps', 'copyComposerIcon')">
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
                     <button x-on:mouseenter="$title('Click to copy')" x-on:click="clipboard('php artisan ds:init', 'copyArtisanIcon')">
                           <div class="flex justify-between">
                              <span>php artisan ds:init</span>
                              <div x-on:mouseenter="$title('Click to copy')">
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
                     <button x-on:mouseenter="$title('Click to copy')" x-on:click="clipboard('ds(\\'Hello World\\');', 'copyDsIcon')">
                           <div class="flex justify-between">
                              <span>ds('Hello world!')</span>
                              <div x-on:mouseenter="$title('Click to copy')">
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
                  Check out our <span class="text-blue-500 underline cursor-pointer dark:text-blue-300">documentation</span> for more information.
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
    main: null,
    rendered: false,
    savedDumpsWindow: false,
    totalPayloadSaved: [],
    dragdropEnabled: false,
    bannedComponents: [],
    fixedScreen: '',
    pinScreen() {
        if (this.fixedScreen !== this.activeScreen) {
            this.fixedScreen = this.activeScreen;

            document.getElementById('svg-pin-screen').classList.add('text-[#f8b810]');

            return;
        }

        document.getElementById('svg-pin-screen').classList.remove('text-[#f8b810]');

        this.fixedScreen = '';
    },
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

        ipcRenderer.send('main:is-always-on-top');

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

                // eslint-disable-next-line prefer-const
                const { screenHtml, screenName } = this.screenHtml(content.content.screenName ?? this.defaultScreenName);

                const { classAttr, raiseIn } = content.content;

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

            let screen;

            if (this.fixedScreen !== '') {
                screen = this.fixedScreen;
            } else {
                screen = payloadScreen.screenName;
            }

            if (payloadScreen.raiseIn > 0) {
                setTimeout(() => {
                    this.filterScreen(screen);
                    this.activeScreen = screen;
                }, payloadScreen.raiseIn);
            } else {
                this.filterScreen(screen);
                this.activeScreen = screen;
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

        ipcRenderer.on('table', (event, arg) => this.dispatchDump('table', arg.content, arg.pusher));

        ipcRenderer.on('model', (event, arg) => this.dispatchDump('model', arg.content));

        ipcRenderer.on('livewire', (event, arg) => this.dispatchDump('livewire', arg.content));

        ipcRenderer.on('livewire-events', (event, arg) => this.dispatchDump('livewire-events', arg.content));

        ipcRenderer.on('livewire-events-returned', (event, arg) => this.dispatchDump('livewire-events-returned', arg.content));

        ipcRenderer.on('clear', () => this.clear());

        ipcRenderer.on('events', (event, arg) => this.dispatchDump('events', arg.content));

        ipcRenderer.on('time-track', (event, arg) => this.dispatchDump('time-track', arg.content));

        ipcRenderer.on('main:is-always-on-top', (event, arg) => {
            this.isAlwaysOnTop = arg.is_always_on_top;
        });

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

        this.$dispatch('dumper:empty-time-trackers');

        this.removeLivewirePropertiesCard();

        this.$dispatch('dumper:clear');

        this.fixedScreen = '';
    },
    addLivewirePropertiesCard(search = true) {
        this.$refs.body.classList.add('flex', 'mr-3', 'h-full');
        this.$refs.livewire.classList.remove('hidden');
        this.$refs.main.classList.add('w-1/2');
        if (this.$refs.filterComponent != null) {
            if (search) {
                this.$refs.filterComponent.classList.remove('hidden');

                return;
            }

            this.$refs.filterComponent.classList.add('hidden');
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

            if (['livewire', 'livewire-events', 'livewire-events-returned'].includes(type)) {
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

            let screen;
            if (this.fixedScreen !== '') {
                screen = this.fixedScreen;
            } else {
                screen = this.activeScreen;
            }

            setTimeout(() => {
                this.filterScreen(screen);
                this.activeScreen = this.defaultScreenName;
            }, 100);
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
    handleLivewireEventsCard(notificationId) {
        this.$dispatch('handleLivewireEventsCard', notificationId);
    },
    removeLivewireHighLight(notificationId) {
        this.$dispatch('removeLivewireHighLight', notificationId);
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
        }

        if (['Events', 'Dispatch'].includes(screen)) {
            this.addLivewirePropertiesCard(false);
        }

        if (!['Livewire', 'Events', 'Dispatch'].includes(screen)) {
            this.removeLivewirePropertiesCard();
        }

        filterScreen(screen);
        this.screenList.forEach((element) => {
            element.active = element.screenName === screen;
        });
        this.activeScreen = screen;

        if (screen === this.fixedScreen) {
            document.getElementById('svg-pin-screen').classList.add('text-[#f8b810]');
        } else {
            document.getElementById('svg-pin-screen').classList.remove('text-[#f8b810]');
        }
    },
    searchableTable(id) {
        searchableTable(id);
    },
    searchComponents() {
        const input = document.getElementById('search');
        const filter = input.value.toString();
        filterComponentScreen(filter);
    },
    screenHtml(screenName) {
        let screenHtml = '';
        let counter = '';

        if (['Events', 'Dispatch'].includes(screenName)) {
            counter = `<span id="screen-${screenName}-counter" class="inline-flex items-center justify-center text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full w-4 !h-[16px]">1</span>`;
        }

        if (['Livewire', 'Events', 'Dispatch'].includes(screenName)) {
            screenHtml = `<div class="w-full flex justify-between items-center space-x-2">
<span class="w-[1rem]">
<svg class="w-20 h-20" viewBox="0 0 234 54" xmlns:xlink="http://www.w3.org/1999/xlink">
   <defs>
      <path d="M6.21428571,3.96764549 L6.21428571,13.5302735 C6.21428571,15.2463011 4.82317047,16.6374164 3.10714286,16.6374164 C1.39111524,16.6374164 -2.95438243e-14,15.2463011 -2.97539771e-14,13.5302735 L-2.9041947e-14,1.98620229 C0.579922224,0.921664997 1.24240791,1.12585387e-13 2.43677218,1.0658141e-13 C4.3810703,1.0658141e-13 5.06039718,2.44244728 6.21428571,3.96764549 Z M17.952381,4.46584612 L17.952381,19.587619 C17.952381,21.4943164 16.4066974,23.04 14.5,23.04 C12.5933026,23.04 11.047619,21.4943164 11.047619,19.587619 L11.047619,2.47273143 C11.6977478,1.21920793 12.3678531,1.0658141e-13 13.7415444,1.0658141e-13 C15.916357,1.0658141e-13 16.5084695,3.05592831 17.952381,4.46584612 Z M29,4.18831009 L29,15.1664032 C29,16.8824308 27.6088848,18.2735461 25.8928571,18.2735461 C24.1768295,18.2735461 22.7857143,16.8824308 22.7857143,15.1664032 L22.7857143,1.67316044 C23.3267006,0.747223402 23.9709031,1.0658141e-13 25.0463166,1.0658141e-13 C27.0874587,1.0658141e-13 27.7344767,2.69181961 29,4.18831009 Z" id="path-100"></path>
      <path d="M6.21428571,6.89841791 C5.66311836,6.22351571 5.01068733,5.72269617 4.06708471,5.72269617 C1.82646191,5.72269617 1.41516964,8.5465388 1.66533454e-15,9.81963771 L4.4408921e-16,-2.36068323 C2.33936437e-16,-4.07671085 1.39111524,-5.46782609 3.10714286,-5.46782609 C4.82317047,-5.46782609 6.21428571,-4.07671085 6.21428571,-2.36068323 L6.21428571,6.89841791 Z M17.952381,7.11630262 C17.3645405,6.33416295 16.6773999,5.72269617 15.6347586,5.72269617 C13.1419388,5.72269617 12.9134319,9.21799873 11.047619,10.1843478 L11.047619,4.79760812 C11.047619,2.89091077 12.5933026,1.34522717 14.5,1.34522717 C16.4066974,1.34522717 17.952381,2.89091077 17.952381,4.79760812 L17.952381,7.11630262 Z M29,6.51179 C28.521687,6.04088112 27.9545545,5.72269617 27.2024325,5.72269617 C24.7875975,5.72269617 24.497619,9.0027269 22.7857143,10.086414 L22.7857143,-0.846671395 C22.7857143,-2.56269901 24.1768295,-3.95381425 25.8928571,-3.95381425 C27.6088848,-3.95381425 29,-2.56269901 29,-0.846671395 L29,6.51179 Z" id="path-300"></path>
   </defs>
   <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
      <g id="10.5″-iPad-Pro-Copy-6" transform="translate(-116.000000, -134.000000)">
         <g id="Group-3" transform="translate(115.000000, 136.000000)">
            <g id="Jelly" style="transform: translateY(3%);">
               <path d="M46.7606724,33.2469068 C45.9448607,34.4803214 45.3250477,36 43.6664081,36 C40.8749581,36 40.7240285,31.6956522 37.9310842,31.6956522 C35.1381399,31.6956522 35.2890695,36 32.4976195,36 C29.7061695,36 29.55524,31.6956522 26.7622957,31.6956522 C23.9693513,31.6956522 24.1202809,36 21.3288309,36 C18.537381,36 18.3864514,31.6956522 15.5935071,31.6956522 C12.8005628,31.6956522 12.9514923,36 10.1600424,36 C9.2827466,36 8.66625943,35.5748524 8.14660082,34.9917876 C6.14914487,31.5156333 5,27.4421238 5,23.0869565 C5,10.3363825 14.8497355,0 27,0 C39.1502645,0 49,10.3363825 49,23.0869565 C49,26.7327091 48.1947338,30.1810893 46.7606724,33.2469068 Z" id="Body-Copy-2" fill="#FB70A9"></path>
               <g id="Legs" transform="translate(12.000000, 27.000000)">
                  <mask id="mask-2" fill="white">
                     <use xlink:href="#path-100"></use>
                  </mask>
                  <use id="Combined-Shape" fill="#4E56A6" xlink:href="#path-100"></use>
                  <mask id="mask-4" fill="white">
                     <use xlink:href="#path-300"></use>
                  </mask>
                  <use id="Combined-Shape" fill-opacity="0.298513986" fill="#000000" xlink:href="#path-300"></use>
               </g>
               <path d="M46.7606724,33.2469068 C45.9448607,34.4803214 45.3250477,36 43.6664081,36 C40.8749581,36 40.7240285,31.6956522 37.9310842,31.6956522 C35.1381399,31.6956522 35.2890695,36 32.4976195,36 C29.7061695,36 29.55524,31.6956522 26.7622957,31.6956522 C23.9693513,31.6956522 24.1202809,36 21.3288309,36 C18.537381,36 18.3864514,31.6956522 15.5935071,31.6956522 C12.8005628,31.6956522 12.9514923,36 10.1600424,36 C9.2827466,36 8.66625943,35.5748524 8.14660082,34.9917876 C6.14914487,31.5156333 5,27.4421238 5,23.0869565 C5,10.3363825 14.8497355,0 27,0 C39.1502645,0 49,10.3363825 49,23.0869565 C49,26.7327091 48.1947338,30.1810893 46.7606724,33.2469068 Z" id="Body-Copy-4" fill="#FB70A9"></path>
               <path d="M42,35.5400931 C47.765228,26.9635183 47.9142005,17.4501539 42.4469174,7 C46.4994826,11.151687 49,16.849102 49,23.1355865 C49,26.7676093 48.1653367,30.203003 46.6789234,33.2572748 C45.8333297,34.4860445 45.1908898,36 43.4716997,36 C42.8832919,36 42.4080759,35.8226537 42,35.5400931 Z" id="Combined-Shape" fill="#E24CA6"></path>
               <g id="Eyes-Copy-2" transform="translate(0.000000, 6.000000)">
                  <path d="M25.8205128,22.8461538 C33.4710351,22.8461538 36.6923077,18.4078931 36.6923077,12.1048951 C36.6923077,5.80189712 31.8248393,0 25.8205128,0 C19.8161863,0 14.9487179,5.80189712 14.9487179,12.1048951 C14.9487179,18.4078931 18.1699905,22.8461538 25.8205128,22.8461538 Z" id="Oval" fill="#FFFFFF"></path>
                  <g id="Pupil" transform="translate(18.820513, 3.461538)">
                     <ellipse id="Oval" fill="#030776" cx="4.07692308" cy="4.5" rx="4.07692308" ry="4.5"></ellipse>
                     <ellipse id="Oval" fill="#FFFFFF" cx="3.3974359" cy="3.46153846" rx="2.03846154" ry="2.07692308"></ellipse>
                  </g>
               </g>
            </g>
         </g>
      </g>
   </g>
</svg>
</span>
<span>${screenName} ${counter}
</div>`;
        }

        if (screenHtml === '') {
            screenHtml = screenName;
        }

        return { screenHtml, screenName };
    },
});
