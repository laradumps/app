import { format } from 'sql-formatter';
import * as JsonViewer from 'json-viewer-js';
import moment from 'moment/moment';
import storage from 'electron-json-storage';
import os from 'os';
import { makeHightlight } from '@/js/plugins/hightlight';
import * as Helper from '../helpers';

const hljs = require('highlight.js/lib/common');
const humanizeDuration = require('humanize-duration');
const htmldiff = require('../plugins/diff');

export default () => ({
    notificationId: null,
    label: null,
    type: null,
    content: null,
    ideHandle: null,
    originalContent: [],
    lastContent: [],
    lastContentReturned: [],
    events: [],
    dispatch: [],
    timeTrackers: [],
    init() {
        this.lastContent = [];

        window.addEventListener('dumper:screen', ({ detail }) => {
            const { screenName } = detail;
            if (document.getElementById(this.notificationId) != null) {
                let classList = `filterScreen laraDumpsScreen-${screenName} collapsable p-2 mb-2 shadow-md rounded
                    dark:bg-slate-700 bg-white border-slate-300 dark:border-slate-600 cursor-pointer items-start
                    focus:!bg-indigo-400 focus:!text-white group-focus:text-white
                    w-full text-sm text-neutral-700 hover:text-neutral-800 font-normal dark:text-slate-300
                    font-medium text-gray-500 hidden`;
                if (this.type === 'livewire') {
                    classList += ` hover:bg-slate-200 filterComponentScreen laraDumpsComponentScreen-${this.notificationId}`;
                }

                if (this.type === 'livewire-events') {
                    classList += ' hover:bg-slate-200';
                }

                if (this.type === 'livewire-events') {
                    if (document.getElementById('screen-Dispatch-counter') !== null) {
                        document.getElementById('screen-Dispatch-counter').innerText = this.events.filter((event) => event.event.dispatch).length;
                    }
                    if (document.getElementById('screen-Events-counter') !== null) {
                        document.getElementById('screen-Events-counter').innerText = this.events.filter((event) => !event.event.dispatch).length;
                    }
                }

                document.getElementById(this.notificationId).setAttribute('class', classList);
            }
        });
        window.addEventListener('handleLivewireDumpCard', ({ detail }) => {
            this.handleLivewireDumpCard(detail);
        });
        window.addEventListener('handleLivewireEventsCard', ({ detail }) => {
            this.handleLivewireEventsCard(detail);
        });
        window.addEventListener('removeLivewireHighLight', ({ detail }) => {
            this.removeLivewireHighLight(detail);
        });
        window.addEventListener('dumper:empty-time-trackers', ({ detail }) => {
            this.timeTrackers = [];
        });
        window.addEventListener('dumper:dump', ({ detail }) => {
            this.mount(detail, 'dump');
            this.handleDump();
        });
        window.addEventListener('dumper:time-track', ({ detail }) => {
            this.mount(detail, 'time-track');
            this.handleTimeTrack();
        });
        window.addEventListener('dumper:queries', ({ detail }) => {
            this.mount(detail, 'queries');
            this.handleQueries();
        });
        window.addEventListener('dumper:query', ({ detail }) => {
            this.mount(detail, 'query');
            this.handleQuery();
        });
        window.addEventListener('dumper:table', ({ detail }) => {
            this.mount(detail, 'table');
            this.handleTable();
        });
        window.addEventListener('dumper:log', ({ detail }) => {
            this.mount(detail, 'log');
            this.handleLogs();
        });
        window.addEventListener('dumper:color', ({ detail }) => {
            this.mount(detail);
            this.handleColor();
        });
        window.addEventListener('dumper:json', ({ detail }) => {
            this.mount(detail, 'color');
            this.handleJson();
        });
        window.addEventListener('dumper:contains', ({ detail }) => {
            this.mount(detail, 'contains');
            this.handleContains();
        });
        window.addEventListener('dumper:label', ({ detail }) => {
            this.mount(detail, 'label');
            this.handleLabel();
        });
        window.addEventListener('dumper:diff', ({ detail }) => {
            this.mount(detail, 'diff');
            this.handleDiff();
        });
        window.addEventListener('dumper:model', ({ detail }) => {
            this.mount(detail, 'model');
            this.handleModel();
        });
        window.addEventListener('dumper:livewire', ({ detail }) => {
            this.mount(detail, 'livewire');
            this.handleLivewireComponents();
        });
        window.addEventListener('dumper:livewire-events', ({ detail }) => {
            this.mount(detail, 'livewire-events');
            this.handleLivewireEvents();
        });
        window.addEventListener('dumper:livewire-events-returned', ({ detail }) => {
            this.mount(detail, 'livewire-events-returned');
            this.handleLivewireEventsReturned();
        });
        window.addEventListener('dumper:clear', () => {
            this.lastContent = [];
            this.lastContentReturned = [];
            this.originalContent = [];
            this.content = 0;
        });
    },
    mount(detail, type) {
        this.notificationId = detail.id;
        this.type = type;
        this.label = detail.content.label ?? detail.type;
        this.content = detail.content;
        this.ideHandle = detail.ideHandle;

        if (typeof detail.content.is_case_sensitive !== 'undefined') {
            this.is_case_sensitive = detail.content.is_case_sensitive;
        }

        if (typeof detail.content.is_whole_word !== 'undefined') {
            this.is_whole_word = detail.content.is_whole_word;
        }

        const welcome = document.querySelector('[x-ref=\'welcome\']');

        if (typeof (welcome) !== 'undefined' && welcome != null) {
            welcome.setAttribute('class', 'w-auto mx-5 text-sm p-6 shadow bg-white rounded dark:text-slate-300 dark:bg-slate-700 hidden');
        }

        this.$dispatch('app:resolve-toggle-buttons');
    },
    handleDump() {
        const pre = document.createElement('pre');
        const original = document.createElement('div');

        const { dump, originalContent } = this.content;

        this.originalContent[this.notificationId] = originalContent;

        original.setAttribute('class', 'hidden');
        original.setAttribute('id', `original-content-${this.notificationId}`);
        pre.setAttribute('class', 'sf-dump-debug');
        pre.setAttribute('id', `sf-dump-${this.notificationId}`);
        pre.setAttribute('data-indent-pad', '  ');

        pre.innerHTML = dump;
        original.innerText = originalContent;

        this.handleDebugElement();

        this.debugElement().appendChild(pre);

        this.debugElement().appendChild(original);

        this.handleIdeProtocol();

        window.Sfdump(`sf-dump-${this.notificationId}`);
    },
    handleTimeTrack() {
        const div = document.createElement('div');
        const pre = document.createElement('pre');
        const code = document.createElement('code');
        const { timeTrackerId, time } = this.content;

        const timeTracker = this.timeTrackers.find((tracker) => tracker.id === timeTrackerId);

        // New tracker request
        if (timeTracker === undefined) {
            this.timeTrackers.push({ id: timeTrackerId, time });
            return;
        }

        const _end = moment.unix(timeTracker.time);
        const _start = moment.unix(time);
        const duration = moment.duration(_start.diff(_end));
        const elapsedTime = humanizeDuration(duration.asMilliseconds());

        // Remove tracker
        this.timeTrackers.splice(timeTracker);

        code.innerHTML = `&#8987; Elapsed time: <div class="mt-3 px-5 font-semibold">${elapsedTime} &nbsp;<span class="font-normal"><small>(${duration.asMilliseconds()} ms)</small></span></div>`;

        pre.appendChild(code);

        div.setAttribute('class', 'text-lg p-4 text-slate-600 dark:text-slate-300 text-sm font-light');
        div.appendChild(pre);

        this.handleDebugElement();
        this.debugElement().appendChild(div);
        this.handleIdeProtocol();
    },
    handleModel() {
        const preAttributes = document.createElement('pre');
        const preRelation = document.createElement('pre');
        const divisor = document.createElement('div');

        const { attributes, relations, className } = this.content;

        preAttributes.setAttribute('class', 'sf-dump-debug');
        preAttributes.setAttribute('id', `sf-dump-${this.notificationId}`);
        preAttributes.setAttribute('data-indent-pad', '  ');
        preAttributes.innerHTML = attributes;

        preRelation.setAttribute('class', 'sf-dump-debug');
        preRelation.setAttribute('id', `sf-dump-${this.notificationId}-model`);
        preRelation.setAttribute('data-indent-pad', '  ');
        preRelation.innerHTML = relations;

        divisor.innerHTML = '<div class="px-3 font-semibold">Relations</div>';

        this.handleDebugElement(`Class: ${className}`);

        this.debugElement().appendChild(preAttributes);

        if (relations.length > 0) {
            this.debugElement().appendChild(divisor);
        }

        this.debugElement().appendChild(preRelation);

        this.handleIdeProtocol();

        window.Sfdump(`sf-dump-${this.notificationId}`);
        window.Sfdump(`sf-dump-${this.notificationId}-model`);
    },
    handleLivewireComponents() {
        const { view } = this.content.component;

        this.content.ideHandle = this.ideHandle;
        this.lastContent[this.notificationId] = this.content;

        const notificationId = view;

        if (document.getElementById(notificationId) == null) {
            this.handleLivewireDebugElement(notificationId);
        } else {
            this.handleLivewireDumpCard(notificationId, false);
        }
    },
    handleLivewireEvents() {
        const { event } = this.content.event;

        this.events = this.events.filter((entry) => entry.event.event !== this.notificationId);

        this.events.push(this.content);

        this.lastContent[this.notificationId] = this.content;

        if (document.getElementById(this.notificationId) == null) {
            this.handleLivewireEventsDebugElement(this.notificationId);
        } else {
            this.handleLivewireEventsCard(this.notificationId, event);
        }
    },
    handleLivewireEventsReturned() {
        this.events.filter((entry) => `ds-event-${entry.event.event}` === this.notificationId)
            .map((entry) => {
                if (this.content.event.component !== 'null') {
                    entry.event.returned.push({
                        componentHandler: this.content.event.componentHandler,
                        returned: this.content.event.returned,
                        component: this.content.event.component,
                    });

                    document.getElementById(`events-icon-warning-${this.notificationId}`)
                        .classList.add('hidden');
                }

                return entry;
            });
    },
    handleDiff() {
        document.getElementById(this.notificationId).remove();
        const diff = document.createElement('div');
        const { argument, splitDiff } = this.content;

        let originalContent;

        if (typeof this.originalContent[this.notificationId] === 'object') {
            originalContent = JSON.stringify(this.originalContent[this.notificationId]);
        } else {
            originalContent = this.originalContent[this.notificationId];
        }

        if (splitDiff) {
            originalContent = makeHightlight(originalContent, argument);
            const second = makeHightlight(argument, originalContent, true);

            diff.innerHTML = `
                <div class="divide-y divide-slate-300 text-slate-700 dark:text-slate-300 dark:divide-slate-200 text-sm">
                     <div class="w-auto">
                          <div class="font-semibold text-left mt-3 ml-3">Original</div>
                          <div class="px-2 py-3 overflow-auto whitespace-nowrap">${originalContent}</div>
                     </div>
                     <div class="w-auto">
                          <div class="font-semibold text-left mt-3 ml-3">Diff</div>
                          <div class="px-2 py-3 overflow-auto whitespace-nowrap">${second}</div>
                     </div>
                </div>`;
        } else {
            diff.setAttribute('class', 'p-3');
            diff.innerHTML = htmldiff(originalContent, argument);
        }

        this.handleDebugElement();

        this.debugElement().appendChild(diff);

        this.handleIdeProtocol();
    },
    handleQuery() {
        const div = document.createElement('div');
        const pre = document.createElement('pre');
        const code = document.createElement('code');
        const copy = document.createElement('div');

        div.setAttribute('class', 'text-lg p-4 text-slate-600 dark:text-slate-300 text-sm font-light');
        code.setAttribute('class', 'language-sql hljs');

        this.handleDebugElement();

        const { sql } = this.content;

        const html = hljs.highlight(format(sql, { indent: '    ' }), { language: 'sql' }).value;

        pre.setAttribute('class', 'flex justify-center relative group');
        pre.setAttribute('x-on:click', `clipboard('${sql.replace(/'/g, "\\'")}', 'copyQueryIcon-${this.notificationId}')`);

        code.innerHTML = html;
        pre.appendChild(code);

        copy.setAttribute('class', 'absolute inset-y-0 right-0 pr-2.5 flex opacity-0 cursor-pointer group-hover:opacity-100 transition');

        copy.innerHTML = `
           <svg class="w-5 h-5 hover:text-slate-800" fill="none"
                     x-ref="copyQueryIcon-${this.notificationId}"
                     viewBox="0 0 24 24" x-bind:stroke="dark ? '#e2e8f0' : '#485569'">
                     <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                           d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
           </svg>
        `;

        pre.appendChild(copy);

        div.appendChild(pre);

        this.debugElement().appendChild(div);

        this.handleIdeProtocol();
    },
    handleQueries() {
        const { queries } = this.content;

        const div = document.createElement('div');
        const connectionInfo = document.createElement('div');
        const pre = document.createElement('pre');
        const code = document.createElement('code');
        const copy = document.createElement('div');

        div.setAttribute('class', 'text-lg p-4 text-slate-600 dark:text-slate-300 text-sm font-light');
        code.setAttribute('class', 'language-sql hljs');

        this.handleDebugElement();

        connectionInfo.innerHTML = `
            <div class="flex justify-between">
                <div class="text-sm text-slate-500 dark:text-slate-400">
                     <span class="privacyMode">connection/database</span>
                     <div class="privacyMode text-sm text-slate-500 dark:text-slate-400 font-bold">
                         ${queries.connectionName}/${queries.database}
                     </div>
                 </div>
                 <div class="text-sm text-slate-500 dark:text-slate-400">
                     time: <span class="text-base font-bold text-slate-600 dark:text-slate-200">${queries.time}</span><span class="text-xs text-slate-500 dark:text-slate-400"> ms</span>

                 </div>
            </div>`;

        const { sql } = this.content.queries;

        const html = hljs.highlight(format(sql, { indent: '    ' }), { language: 'sql' }).value;

        pre.setAttribute('class', 'flex justify-center relative group');
        pre.setAttribute('x-on:click', `clipboard('${sql.replace(/'/g, "\\'")}', 'copyQueryIcon-${this.notificationId}')`);

        code.innerHTML = html;

        pre.appendChild(code);
        div.appendChild(connectionInfo);

        copy.setAttribute('class', 'absolute inset-y-0 right-0 pr-2.5 flex opacity-0 cursor-pointer group-hover:opacity-100 transition');

        copy.innerHTML = `
           <svg class="w-5 h-5 hover:text-slate-800" fill="none"
                     x-ref="copyQueryIcon-${this.notificationId}"
                     viewBox="0 0 24 24" x-bind:stroke="dark ? '#e2e8f0' : '#485569'">
                     <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                           d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
           </svg>
        `;

        pre.appendChild(copy);
        div.appendChild(pre);

        this.debugElement().appendChild(div);

        this.handleIdeProtocol();
    },
    debugElement(notificationId = this.notificationId) {
        return document.getElementById(`debug-${notificationId}`);
    },
    handleTable() {
        const { values, fields, header } = this.content;

        const table = Helper.createTable(values, fields, header, this.notificationId);

        this.handleDebugElement();

        this.debugElement().appendChild(table);

        this.handleIdeProtocol();
    },
    handleLogs() {
        const pre = document.createElement('pre');
        const div = document.createElement('div');

        const { level, message, context } = this.content.value;

        const levelsWithSearchBar = ['emergency', 'error', 'critical'];

        const searchOptions = [
            { name: 'Google', url: 'https://www.google.com/search?q=' },
            { name: 'Stack Overflow', url: 'https://stackoverflow.com/search?q=' },
            { name: 'Laracasts', url: 'https://laracasts.com/discuss?q=' },
        ];

        let searchBar = '';

        if (levelsWithSearchBar.includes(level)) {
            // Try to remove the PHP file path for better result searches
            const searchString = encodeURIComponent(message.replace(/(;|\/)([^;]*.php)/, ''));

            const svg = '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16l2.879-2.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242zM21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';

            searchOptions.forEach((searchOption) => searchBar += `<button x-on:click="openLink('${searchOption.url}${searchString}')"  class="btn flex-shrink-0 btn-white rounded-t-sm text-xs justify-center items-center select-none 
              p-1 m-1 ">${svg} ${searchOption.name}</button>`);

            searchBar = `<div class="px-3  mt-1"><hr><div class="flex mt-1 text-xs justify-between dark:text-slate-700">${searchBar}</div></div>`;
        }

        pre.setAttribute('class', 'sf-dump-debug');
        pre.setAttribute('id', `sf-dump-${this.notificationId}`);
        pre.setAttribute('data-indent-pad', '  ');
        pre.innerHTML = `${context}${searchBar}`;

        div.innerHTML = `<div class="px-2 text-slate-600 dark:text-slate-300 text-sm pt-2">${message}</div>`;

        this.handleDebugElement();

        this.debugElement().appendChild(div).appendChild(pre);

        window.Sfdump(`sf-dump-${this.notificationId}`);

        document.getElementById(`color-${this.notificationId}`)
            .setAttribute('class', `items-center w-[0.75rem] h-[0.75rem] mr-2 rounded-full ${this.content.value.level_color}`);
    },
    handleColor() {
        document.getElementById(`color-${this.notificationId}`)
            .setAttribute('class', `items-center w-[0.75rem] h-[0.75rem] mr-2 rounded-full ${this.content.color}`);
    },
    handleLabel() {
        document.getElementById(`label-${this.notificationId}`)
            .innerText = this.content.label;
    },
    handleJson() {
        const div = document.createElement('div');

        const { textContent } = document.getElementById(`original-content-${this.notificationId}`);

        div.setAttribute('class', 'flex justify-start text-xs w-full');

        let style;

        const isJson = Helper.isJson(textContent);

        style = {
            classAttr: 'bg-red-500',
            text: 'Invalid JSON Format',
        };

        if (isJson) {
            style = {
                classAttr: 'bg-green-500',
                text: 'Valid JSON Format',
            };
            new JsonViewer({
                container: document.querySelector('.sf-dump-debug'),
                data: textContent,
                expand: false,
                theme: 'light',
            });
        }

        div.innerHTML = `
            <div class="flex items-center justify-center">
                  <div class="${style.classAttr} items-center w-[0.50rem] h-[0.50rem] mr-2 rounded-full"></div>
                  <div class="dark:text-slate-300">${style.text}</div>
            </div>`;

        document.getElementById(`validate-container-${this.notificationId}`).classList.add('!flex');

        document.getElementById(`validate-${this.notificationId}`).appendChild(div);
    },
    handleContains() {
        const div = document.createElement('div');

        const { content } = this.content;

        const { textContent } = document.getElementById(`original-content-${this.notificationId}`);

        const searchSettings = {
            is_case_sensitive: this.is_case_sensitive ?? false,
            is_whole_word: this.is_whole_word ?? false,
        };

        div.setAttribute('class', 'flex justify-start text-xs');

        const strContains = Helper.strContains(textContent, content, searchSettings);

        let format;

        if (strContains.success) {
            format = {
                style: 'bg-green-500',
                text: 'Text contains:',
            };
        } else {
            format = {
                style: 'bg-red-500',
                text: 'Text does not contain:',
            };
        }

        div.innerHTML = `
            <div class="flex items-center justify-center">
                 <div class="items-center w-[0.50rem] h-[0.50rem] mr-2 rounded-full ${format.style}"></div>
                 <span class="dark:text-slate-300">${format.text} <div class="underline">${Helper.escapeHtml(content)}</div></span>
            </div>`;

        document.getElementById(`validate-container-${this.notificationId}`).classList.add('!flex');

        document.getElementById(`validate-${this.notificationId}`).appendChild(div);
    },
    removeLivewireHighLight(notificationId) {
        const content = this.lastContent[notificationId];

        const { id } = content.component;

        if (window.Pusher) {
            window.Pusher.trigger('laradumps-livewire-channel', 'remove-highlight-component', { id });
        }
    },
    handleLivewireDumpCard(notificationId, highlight = true) {
        const content = this.lastContent[notificationId];

        const { ideHandle } = content;
        const {
            data, viewHandler, dateTime, id,
        } = content.component;

        if (highlight && window.Pusher) {
            window.Pusher.trigger('laradumps-livewire-channel', 'highlight-component', {
                id,
                component: notificationId,
            });
        }

        this.$refs.livewire.innerHTML = `
            <div class="text-right dark:text-gray-300 flex justify-between text-sm text-gray-600">
                <div class="p-2 text-base font-semibold text-left">${notificationId}</div>
                <div class="p-2">${dateTime}</div>
            </div>
            <div id="debug-${notificationId}"></div>
            <div class="my-1" id="info-${notificationId}">
                <div id="livewire-view-handler-${notificationId}"></div>
            </div>
        `;

        const pre = document.createElement('pre');

        pre.setAttribute('class', 'sf-dump-debug');
        pre.setAttribute('id', `sf-dump-${notificationId}`);
        pre.setAttribute('data-indent-pad', '  ');

        pre.innerHTML = data;

        document.getElementById(`debug-${notificationId}`).appendChild(pre);

        window.Sfdump(`sf-dump-${notificationId}`);

        this.handleIdeProtocol(viewHandler, `livewire-view-handler-${notificationId}`, notificationId);

        this.handleIdeProtocol(ideHandle, '', notificationId);

        this.$nextTick(() => {
            document.getElementById('output').scrollIntoView({
                behavior: 'smooth',
            });
        });
    },
    handleLivewireEventsCard(notificationId) {
        const { event } = this.lastContent[notificationId];
        const {
            params, method, componentHandler,
        } = event;

        if (document.getElementById(`livewire-detail-${notificationId}`) != null) {
            document.getElementById(`livewire-detail-${notificationId}`).innerHTML = '';
        }

        const eventName = notificationId.replace('ds-event-', '');

        this.$refs.livewire.innerHTML = `
            <div id="livewire-detail-${notificationId}">
                <div class="p-2">
                    <h3 class="text-lg leading-6 font-medium text-slate-900 dark:text-slate-200">${eventName}</h3>
                </div>
                <div class="event-only items-center !hidden p-2 sm:grid sm:grid-cols-3 sm:gap-4">
                    <div class="text-sm font-medium text-slate-600 dark:text-slate-300">Emit By</div>
                    <div class="mt-1 text-sm text-slate-600 dark:text-slate-300 sm:mt-0 sm:col-span-2 break-words" id="emitted-by-${notificationId}"></div>
                </div>
               
                <div class="p-2 sm:grid sm:grid-cols-3 sm:gap-4">
                    <div class="text-sm font-medium text-slate-600 dark:text-slate-300">Payload</div>
                    <div class="mt-1 text-sm text-slate-600 dark:text-slate-300 sm:mt-0 sm:col-span-2 break-words" id="debug-${notificationId}"></div>
                </div>
                
                <div class="event-only items-center !hidden">
                    <h3 class="p-2 text-lg leading-6 font-medium text-slate-900 dark:text-slate-300">Listeners</h3>
                    <div class="p-2" id="listeners-${notificationId}"></div>
                </div>
            </div>    
        `;

        const payload = document.createElement('pre');

        payload.setAttribute('class', 'sf-dump-debug');
        payload.setAttribute('style', 'margin-top: -0.75rem; margin-left: -0.75rem;');
        payload.setAttribute('id', `sf-dump-${notificationId}`);
        payload.setAttribute('data-indent-pad', '  ');

        payload.innerHTML = params;

        document.getElementById(`debug-${notificationId}`).appendChild(payload);

        componentHandler.line = method;

        this.handleIdeProtocol(componentHandler, `emitted-by-${notificationId}`, notificationId, false);

        window.Sfdump(`sf-dump-${notificationId}`);

        // *************************
        // remove Emitted By and Listeners when dispatched
        const isEvent = this.events
            .filter((entry) => !entry.event.dispatch && `ds-event-${entry.event.event}` === notificationId).length > 0;

        if (isEvent) {
            [...document.getElementsByClassName('event-only')].map((el) => {
                el.classList.remove('!hidden');
            });
        }
        // ************************

        this.events
            .filter((entry) => `ds-event-${entry.event.event}` === notificationId)
            .forEach((entry) => {
                const { event } = entry;

                const { returned } = event;

                if (entry.event.dispatch) {
                    return;
                }

                const listeners = document.getElementById(`listeners-${notificationId}`);

                returned.forEach((returned) => {
                    const { componentHandler } = returned;

                    const listener = document.createElement('div');

                    listener.innerHTML = `<div class="border-t border-slate-300 dark:border-slate-400">
                        <dl>
                          <div class="p-2 sm:grid sm:grid-cols-3 sm:gap-4">
                            <div class="text-sm font-medium text-slate-600 dark:text-slate-300">To</div>
                            <div class="mt-1 text-sm sm:mt-0 sm:col-span-2 text-slate-900 dark:text-slate-300"
                                id="livewire-events-returned-component-${notificationId}-${returned.component}">${returned.component}</div>
                          </div>
                          <div class="p-2 sm:grid sm:grid-cols-3 sm:gap-4">
                            <div class="text-sm font-medium text-slate-600 dark:text-slate-300">Returned</div>
                            <div class="mt-1 text-sm sm:mt-0 sm:col-span-2 text-slate-900 dark:text-slate-300"
                                id="livewire-events-returned-${notificationId}-${returned.component}">
                            </div>
                          </div>
                        </dl>
                      </div>`;

                    listeners.appendChild(listener);

                    this.handleIdeProtocol(componentHandler, `livewire-events-returned-component-${notificationId}-${returned.component}`, notificationId, false);

                    if (typeof returned.returned === 'undefined') {
                        document.getElementById(`livewire-events-returned-component-${notificationId}-${returned.component}`)
                            .innerHTML = '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-800"> No listeners </span>';

                        document.getElementById(`livewire-events-returned-${notificationId}-${returned.component}`)
                            .innerHTML = '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-800"> No listeners </span>';
                    }

                    if (typeof returned.returned !== 'undefined') {
                        const returnedHtml = document.createElement('pre');

                        returnedHtml.setAttribute('class', 'sf-dump-debug');
                        returnedHtml.setAttribute('style', 'margin-top: -0.75rem; margin-left: -0.75rem;');
                        returnedHtml.setAttribute('id', `sf-dump-returned-${notificationId}-${returned.component}`);
                        returnedHtml.setAttribute('data-indent-pad', '  ');

                        returnedHtml.innerHTML = returned.returned;

                        document.getElementById(`livewire-events-returned-${notificationId}-${returned.component}`)
                            .appendChild(returnedHtml);

                        window.Sfdump(`sf-dump-returned-${notificationId}-${returned.component}`);
                    }
                });
            });

        this.$nextTick(() => {
            document.getElementById('output').scrollIntoView({
                behavior: 'smooth',
            });
        });
    },
    handleLivewireDebugElement(notificationId) {
        if (document.getElementById('debug') != null) {
            document.getElementById('debug').removeAttribute('id');
        }

        const debugItem = document.createElement('div');

        debugItem.innerHTML = `
            <!-- dump ${notificationId}-->
            <div id="debug"></div>
            <button x-init="initCollapsableElements"
                id="${notificationId}"
                type="button"
                x-on:mouseleave="removeLivewireHighLight('${notificationId}')" 
                x-on:click="handleLivewireDumpCard('${notificationId}'); $el.focus()" 
                class="filterScreen collapsable laraDumpsScreen-${notificationId} rounded-sm collapsable mb-2 w-full p-1.5 pl-2 shadow-lg text-sm bg-white rounded-sm dark:text-slate-300 dark:bg-slate-700 hover:bg-slate-300">
                   <div class="group relative flex justify-between items-center">                  
                       <span>${notificationId}</span>
                        
                       <div class="w-8 flex justify-end h-auto" title="Remove Component">
                           <svg x-on:click="banComponent('${notificationId}')" class="opacity-0 group-hover:opacity-100 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                           </svg>
                       </div>
                   </div>
            </button>`;

        document.getElementById('debug').appendChild(debugItem);
    },
    handleLivewireEventsDebugElement(notificationId) {
        if (document.getElementById('debug') != null) {
            document.getElementById('debug').removeAttribute('id');
        }

        const debugItem = document.createElement('div');

        const eventName = notificationId.replace('ds-event-', '');

        debugItem.innerHTML = `
            <!-- dump ${notificationId}-->
            <div id="debug"></div>
            <button x-init="initCollapsableElements"
                id="${notificationId}"
                type="button"
                x-on:click="handleLivewireEventsCard('${notificationId}'); $el.focus()" 
                class="filterScreen collapsable laraDumpsScreen-${notificationId} rounded-sm collapsable mb-2 w-full p-1.5 pl-2 shadow-lg text-sm bg-white rounded-sm dark:text-slate-300 dark:bg-slate-700 hover:bg-slate-300">
                   <div class="group relative flex justify-between items-center">                  
                       <span>${eventName}</span>
                       <div class="w-8 flex justify-end h-auto" title="Remove Component">
                           <svg class="h-5 w-5 text-orange-600 dark:text-orang-300" 
                                id="events-icon-warning-${notificationId}"
                                fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                               <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                           </svg>
                       </div>
                   </div>
            </button>
        `;

        document.getElementById('debug').appendChild(debugItem);
    },
    handleDebugElement(customLabel, notificationId = this.notificationId) {
        document.getElementById('debug').removeAttribute('id');
        let encodedFilePath;

        if (typeof this.ideHandle.path === 'string') {
            encodedFilePath = Buffer.from(this.ideHandle.path).toString('base64');
        }

        const debugItem = document.createElement('div');

        debugItem.innerHTML = `
            <!-- dump ${notificationId}-->
            <div id="debug"></div>
            <div draggable="false"
                x-data="{
                    open: true,
                    count: 0,
                    isSaved: false,
                    id: '${notificationId}',
                    type: '${this.type}',
                    content: '${new Buffer(JSON.stringify(this.content)).toString('base64')}',
                    ideHandle: '${new Buffer(JSON.stringify(this.ideHandle)).toString('base64')}'
                }"
                x-init="initCollapsableElements"
                id="${notificationId}"
               class="filterScreen collapsable laraDumpsScreen-screen 1 ${encodedFilePath} collapsable p-2.5 mb-2 shadow-md rounded dark:bg-slate-700 bg-white border-slate-300 dark:border-slate-600 cursor-pointer align-middle items-start font-medium text-gray-500">
                <div x-on:click="toggleCollapse('${notificationId}')" class="flex justify-between w-full cursor-pointer ">
                   <div class="flex items-center justify-center">
                      <div id="color-${notificationId}" class="items-center w-[0.72rem] h-[0.72rem] mr-2 rounded-full bg-slate-300 dark:bg-gray-500"></div>
                      <div>
                         <button id="label-${notificationId}" type="button"
                            class="text-[0.75rem] text-neutral-700 font-normal uppercase dark:text-slate-300">
                                <div class="flex space-x-3">
                                    <span>${customLabel ?? this.label}</span>
                                </div>
                         </button>
                      </div>
                   </div>
                   <div class="flex items-center justify-center">
                      <div x-show="count === 0">
                         <div class="animate-new-dump"></div>
                      </div>
                      <div class="space-x-2">
                          <button id="hour-label-${notificationId}" type="button" class="hour-label">
                             ${moment().format('HH:mm:ss')}
                          </button>
                      </div>
                   </div>
                </div>
                <div class="w-full">
                   <div :class="{ 'hidden' : !open}"
                      class="my-2 rounded-sm bg-slate-100 dark:bg-slate-800 col-span-2 flex justify-center">
                      <div x-show="open"
                           x-transition:enter="transition ease-out duration-300"
                           x-transition:enter-start="opacity-0 scale-90"
                           x-transition:enter-end="opacity-100 scale-100"
                           x-transition:leave="transition ease-in duration-300"
                           x-transition:leave-start="opacity-100 scale-100"
                           x-transition:leave-end="opacity-0 scale-90"
                           id="debug-${notificationId}"
                           class="overflow-hidden w-full"></div>
                      <div class="relative right-0">
                            <button x-show="!savedDumpsWindow"
                                    :disabled="isSaved"
                                    :class="{'opacity-25' : isSaved}"
                                    class="mr-2 mt-2"
                                    x-on:click="isSaved = true; saveDumps({id: id, type: type, content: content, ideHandle: ideHandle})">
                                    <svg viewBox="0 0 16 16" fill="none" class="text-slate-500 h-4 w-4 hover:text-slate-600 ">
                                        <path d="M14 16H2C1.46957 16 0.960859 15.7893 0.585786 15.4142C0.210714 15.0391 0 14.5304 0 14V2C0 1.46957 0.210714
                                            0.960859 0.585786 0.585786C0.960859 0.210714 1.46957 0 2 0L14 0C14.5304 0 15.0391 0.210714 15.4142
                                            0.585786C15.7893 0.960859 16 1.46957 16 2V14C16 14.5304 15.7893 15.0391 15.4142 15.4142C15.0391 15.7893 14.5304
                                            16 14 16ZM8 9C7.60444 9 7.21776 9.1173 6.88886 9.33706C6.55996 9.55682 6.30362 9.86918 6.15224 10.2346C6.00087
                                            10.6001 5.96126 11.0022 6.03843 11.3902C6.1156 11.7781 6.30608 12.1345 6.58579 12.4142C6.86549 12.6939 7.22186
                                            12.8844 7.60982 12.9616C7.99778 13.0387 8.39991 12.9991 8.76537 12.8478C9.13082 12.6964 9.44318 12.44 9.66294
                                            12.1111C9.8827 11.7822 10 11.3956 10 11C10 10.4696 9.78929 9.96086 9.41421 9.58579C9.03914 9.21071 8.53043 9 8
                                            9ZM3 2C2.73478 2 2.48043 2.10536 2.29289 2.29289C2.10536 2.48043 2 2.73478 2 3V6C2 6.26522 2.10536 6.51957
                                            2.29289 6.70711C2.48043 6.89464 2.73478 7 3 7H10C10.2652 7 10.5196 6.89464 10.7071 6.70711C10.8946 6.51957 11
                                            6.26522 11 6V3C11 2.73478 10.8946 2.48043 10.7071 2.29289C10.5196 2.10536 10.2652 2 10 2H3ZM9 6H7V3H9V6Z" fill="currentColor"/>
                                    </svg>
                            </button>
                            <button x-show="savedDumpsWindow"
                                    class="mr-2 mt-2"
                                    x-on:click="removePayload({id: id})">
                                    <svg class="text-slate-500 h-5 w-5 hover:text-slate-600" viewBox="0 0 20 20" fill="currentColor">
                                      <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                                    </svg>
                            </button>
                      </div>
                   </div>
                </div>
                <div id="validate-container-${notificationId}" class="hidden justify-between w-full">
                <div class="flex">
                   <div id="validate-${notificationId}" class="w-full mt-2"></div>
                   <div class="relative">
                      <div></div>
                      <div class="inline-flex">
                         <span class="flex justify-between algin-middle dark:text-slate-300"></span>
                      </div>
                   </div>
                </div>
            </div>`;

        document.getElementById('debug').appendChild(debugItem);
    },
    handleIdeProtocol(ideHandler = {}, element = '', notificationId = this.notificationId, handleDebugElement = true) {
        const handler = ideHandler.handler ?? this.ideHandle.handler;
        const path = ideHandler.path ?? this.ideHandle.path;
        const line = ideHandler.line ?? this.ideHandle.line;

        const div = element ? document.getElementById(element) : document.createElement('div');

        let pathLine = path;

        if (line != 1) {
            pathLine = `${path}:${line}`;
        } else {
            pathLine = path;
        }

        const classes = !handleDebugElement ? '!ml-0' : '';
        div.innerHTML = ` 
            <a href="${handler}" title="Open ${path}" class="privacyMode flex mx-3 items-center ${classes}">
                <div class="w-4 h-4 mr-2 focus:outline-none inline-flex focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 text-blue-500">
                    <svg class="w-full shrink-0 max-h-[16px]" id="629b69df8e81e" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path fill-rule="evenodd" clip-rule="evenodd" d="M5.46402 5.05029C5.46402 4.49801 5.91173 4.05029 6.46402 4.05029L14.9493 4.05029C15.5016 4.05029 15.9493 4.49801 15.9493 5.05029L15.9493 13.5356C15.9493 14.0879 15.5016 14.5356 14.9493 14.5356C14.397 14.5356 13.9493 14.0879 13.9493 13.5356L13.9493 7.46451L5.75691 15.6569C5.36639 16.0474 4.73322 16.0474 4.3427 15.6569C3.95217 15.2664 3.95217 14.6332 4.3427 14.2427L12.5351 6.05029L6.46402 6.05029C5.91173 6.05029 5.46402 5.60258 5.46402 5.05029Z" fill="currentColor"></path>
                    </svg>
                </div>
                <div class="py-2 font-light dark:text-gray-300 text-sm underline text-gray-700 cursor-pointer">
                    <span>${pathLine}</span>
                </div>
            </a>
            `;

        if (handleDebugElement) {
            this.debugElement(notificationId).appendChild(div);
        }
    },
});
