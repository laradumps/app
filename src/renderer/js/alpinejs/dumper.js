import { format } from 'sql-formatter';
import * as JsonViewer from 'json-viewer-js';
import moment from 'moment/moment';
import { makeHightlight } from '@/js/plugins/hightlight';
import * as Helper from '../helpers';
import { isJson } from '../helpers';

const hljs = require('highlight.js/lib/common');
const htmldiff = require('../plugins/diff');

export default () => ({
    notificationId: null,
    label: null,
    type: null,
    content: null,
    ideHandle: null,
    originalContent: [],
    init() {
        window.addEventListener('dumper:screen', ({ detail }) => {
            const { label } = detail;
            if (document.getElementById(this.notificationId) != null) {
                document.getElementById(this.notificationId).setAttribute('class', `filterScreen laraDumpsScrn-${label} collapsable p-3 mb-4 shadow-md rounded dark:bg-slate-700 bg-white border-slate-300 dark:border-slate-600 cursor-pointer align-middle items-start font-medium text-gray-500 hidden`);
            }
        });
        window.addEventListener('dumper:dump', ({ detail }) => {
            this.mount(detail, 'dump');
            this.handleDump();
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
        const pre = document.createElement('pre');
        const info = document.createElement('div');

        const { data, view, viewHandler } = this.content.component;

        const notificationId = view;

        pre.setAttribute('class', 'sf-dump-debug');
        pre.setAttribute('id', `sf-dump-${notificationId}`);
        pre.setAttribute('data-indent-pad', '  ');

        pre.innerHTML = data;

        info.innerHTML = `
            <div class="my-2">
                <div id="livewire-view-handler-${notificationId}"></div>
            </div>`;

        if (document.getElementById(notificationId) == null) {
            this.handleDebugElement(notificationId, notificationId);
        } else {
            document.getElementById(`hour-label-${notificationId}`).innerHTML = moment().format('HH:mm:ss');
            document.getElementById(`debug-${notificationId}`).innerHTML = '';
        }

        this.debugElement(notificationId).appendChild(pre);
        this.debugElement(notificationId).appendChild(info);

        window.Sfdump(`sf-dump-${notificationId}`);

        this.handleIdeProtocol(viewHandler, `livewire-view-handler-${notificationId}`, notificationId);

        this.handleIdeProtocol('', '', notificationId);
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
                <div class="divide-y divide-slate-300 dark:divide-slate-200">
                     <div class="w-auto">                             
                          <div class="font-semibold text-slate-600 dark:text-slate-300 text-left mt-3 ml-3">Original</div>
                          <div class="px-2 py-3 overflow-auto whitespace-nowrap">${originalContent}</div>
                     </div>
                     <div class="w-auto">
                          <div class="font-semibold text-slate-600 dark:text-slate-300 text-left mt-3 ml-3">Diff</div>
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

        pre.setAttribute('class', 'sf-dump-debug');
        pre.setAttribute('id', `sf-dump-${this.notificationId}`);
        pre.setAttribute('data-indent-pad', '  ');

        const { message, context } = this.content.value;

        div.innerHTML = `<div class="px-2 text-slate-600 dark:text-slate-300 text-sm pt-2">${message}</div>`;

        pre.innerHTML = context;

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
        document.getElementById(`label_${this.notificationId}`)
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
        let highlighted;

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
    handleDebugElement(customLabel, notificationId = this.notificationId) {
        document.getElementById('debug').removeAttribute('id');
        let encodedFilePath;

        if (typeof this.ideHandle.path === 'string') {
            encodedFilePath = Buffer.from(this.ideHandle.path).toString('base64');
        }

        const debugItem = document.createElement('div');

        const uniqueNotification = [
            'livewire',
        ];

        const open = uniqueNotification.includes(this.type) ? 'false' : 'true';
        const unique = uniqueNotification.includes(this.type);

        // const livewireSvg = `<span title="Livewire Component"><svg id="livewire-icon-${notificationId}" class="w-20 h-20" viewBox="0 0 234 54" xmlns:xlink="http://www.w3.org/1999/xlink">\n    <defs>\n        <path d="M6.21428571,3.96764549 L6.21428571,13.5302735 C6.21428571,15.2463011 4.82317047,16.6374164 3.10714286,16.6374164 C1.39111524,16.6374164 -2.95438243e-14,15.2463011 -2.97539771e-14,13.5302735 L-2.9041947e-14,1.98620229 C0.579922224,0.921664997 1.24240791,1.12585387e-13 2.43677218,1.0658141e-13 C4.3810703,1.0658141e-13 5.06039718,2.44244728 6.21428571,3.96764549 Z M17.952381,4.46584612 L17.952381,19.587619 C17.952381,21.4943164 16.4066974,23.04 14.5,23.04 C12.5933026,23.04 11.047619,21.4943164 11.047619,19.587619 L11.047619,2.47273143 C11.6977478,1.21920793 12.3678531,1.0658141e-13 13.7415444,1.0658141e-13 C15.916357,1.0658141e-13 16.5084695,3.05592831 17.952381,4.46584612 Z M29,4.18831009 L29,15.1664032 C29,16.8824308 27.6088848,18.2735461 25.8928571,18.2735461 C24.1768295,18.2735461 22.7857143,16.8824308 22.7857143,15.1664032 L22.7857143,1.67316044 C23.3267006,0.747223402 23.9709031,1.0658141e-13 25.0463166,1.0658141e-13 C27.0874587,1.0658141e-13 27.7344767,2.69181961 29,4.18831009 Z" id="path-100"></path>\n        <path d="M6.21428571,6.89841791 C5.66311836,6.22351571 5.01068733,5.72269617 4.06708471,5.72269617 C1.82646191,5.72269617 1.41516964,8.5465388 1.66533454e-15,9.81963771 L4.4408921e-16,-2.36068323 C2.33936437e-16,-4.07671085 1.39111524,-5.46782609 3.10714286,-5.46782609 C4.82317047,-5.46782609 6.21428571,-4.07671085 6.21428571,-2.36068323 L6.21428571,6.89841791 Z M17.952381,7.11630262 C17.3645405,6.33416295 16.6773999,5.72269617 15.6347586,5.72269617 C13.1419388,5.72269617 12.9134319,9.21799873 11.047619,10.1843478 L11.047619,4.79760812 C11.047619,2.89091077 12.5933026,1.34522717 14.5,1.34522717 C16.4066974,1.34522717 17.952381,2.89091077 17.952381,4.79760812 L17.952381,7.11630262 Z M29,6.51179 C28.521687,6.04088112 27.9545545,5.72269617 27.2024325,5.72269617 C24.7875975,5.72269617 24.497619,9.0027269 22.7857143,10.086414 L22.7857143,-0.846671395 C22.7857143,-2.56269901 24.1768295,-3.95381425 25.8928571,-3.95381425 C27.6088848,-3.95381425 29,-2.56269901 29,-0.846671395 L29,6.51179 Z" id="path-300"></path>\n    </defs>\n    <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">\n        <g id="10.5″-iPad-Pro-Copy-6" transform="translate(-116.000000, -134.000000)">\n            <g id="Group-3" transform="translate(115.000000, 136.000000)">               \n                <g id="Jelly" style="transform: translateY(3%);">\n                    <path d="M46.7606724,33.2469068 C45.9448607,34.4803214 45.3250477,36 43.6664081,36 C40.8749581,36 40.7240285,31.6956522 37.9310842,31.6956522 C35.1381399,31.6956522 35.2890695,36 32.4976195,36 C29.7061695,36 29.55524,31.6956522 26.7622957,31.6956522 C23.9693513,31.6956522 24.1202809,36 21.3288309,36 C18.537381,36 18.3864514,31.6956522 15.5935071,31.6956522 C12.8005628,31.6956522 12.9514923,36 10.1600424,36 C9.2827466,36 8.66625943,35.5748524 8.14660082,34.9917876 C6.14914487,31.5156333 5,27.4421238 5,23.0869565 C5,10.3363825 14.8497355,0 27,0 C39.1502645,0 49,10.3363825 49,23.0869565 C49,26.7327091 48.1947338,30.1810893 46.7606724,33.2469068 Z" id="Body-Copy-2" fill="#FB70A9"></path>\n                    <g id="Legs" transform="translate(12.000000, 27.000000)">\n                        <mask id="mask-2" fill="white">\n                            <use xlink:href="#path-100"></use>\n                        </mask>\n                        <use id="Combined-Shape" fill="#4E56A6" xlink:href="#path-100"></use>\n                        <mask id="mask-4" fill="white">\n                            <use xlink:href="#path-300"></use>\n                        </mask>\n                        <use id="Combined-Shape" fill-opacity="0.298513986" fill="#000000" xlink:href="#path-300"></use>\n                    </g>\n                    <path d="M46.7606724,33.2469068 C45.9448607,34.4803214 45.3250477,36 43.6664081,36 C40.8749581,36 40.7240285,31.6956522 37.9310842,31.6956522 C35.1381399,31.6956522 35.2890695,36 32.4976195,36 C29.7061695,36 29.55524,31.6956522 26.7622957,31.6956522 C23.9693513,31.6956522 24.1202809,36 21.3288309,36 C18.537381,36 18.3864514,31.6956522 15.5935071,31.6956522 C12.8005628,31.6956522 12.9514923,36 10.1600424,36 C9.2827466,36 8.66625943,35.5748524 8.14660082,34.9917876 C6.14914487,31.5156333 5,27.4421238 5,23.0869565 C5,10.3363825 14.8497355,0 27,0 C39.1502645,0 49,10.3363825 49,23.0869565 C49,26.7327091 48.1947338,30.1810893 46.7606724,33.2469068 Z" id="Body-Copy-4" fill="#FB70A9"></path>\n                    <path d="M42,35.5400931 C47.765228,26.9635183 47.9142005,17.4501539 42.4469174,7 C46.4994826,11.151687 49,16.849102 49,23.1355865 C49,26.7676093 48.1653367,30.203003 46.6789234,33.2572748 C45.8333297,34.4860445 45.1908898,36 43.4716997,36 C42.8832919,36 42.4080759,35.8226537 42,35.5400931 Z" id="Combined-Shape" fill="#E24CA6"></path>\n                    <g id="Eyes-Copy-2" transform="translate(0.000000, 6.000000)">\n                        <path d="M25.8205128,22.8461538 C33.4710351,22.8461538 36.6923077,18.4078931 36.6923077,12.1048951 C36.6923077,5.80189712 31.8248393,0 25.8205128,0 C19.8161863,0 14.9487179,5.80189712 14.9487179,12.1048951 C14.9487179,18.4078931 18.1699905,22.8461538 25.8205128,22.8461538 Z" id="Oval" fill="#FFFFFF"></path>\n                        <g id="Pupil" transform="translate(18.820513, 3.461538)">\n                            <ellipse id="Oval" fill="#030776" cx="4.07692308" cy="4.5" rx="4.07692308" ry="4.5"></ellipse>\n                            <ellipse id="Oval" fill="#FFFFFF" cx="3.3974359" cy="3.46153846" rx="2.03846154" ry="2.07692308"></ellipse>\n                        </g>\n                    </g>\n                </g>\n            </g>\n        </g>\n    </g>\n</svg></span>`;

        debugItem.innerHTML = `
            <!-- dump ${notificationId}-->
            <div id="debug"></div>
            <div draggable="false"
                x-data="{ 
                    open: ${open},
                    count: 0, 
                    isSaved: false,
                    id: '${notificationId}', 
                    type: '${this.type}',
                    content: '${new Buffer(JSON.stringify(this.content)).toString('base64')}', 
                    ideHandle: '${new Buffer(JSON.stringify(this.ideHandle)).toString('base64')}'
                }" 
                x-init="initCollapsableElements" 
                id="${notificationId}"
               class="filterScreen collapsable laraDumpsScrn-screen 1 ${encodedFilePath} rounded-sm collapsable p-4 mb-4 w-full p-3 shadow-lg text-sm bg-white rounded-sm dark:text-slate-300 dark:bg-slate-700">
                <div x-on:click="toggleCollapse" class="flex justify-between w-full cursor-pointer ">
                   <div class="flex items-center justify-center">
                      <div id="color-${notificationId}" class="items-center w-[0.72rem] h-[0.72rem] mr-2 rounded-full bg-slate-300 dark:bg-gray-500"></div>
                      <div>
                         <button id="label_${notificationId}" type="button" 
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

        if (!unique || document.getElementById(notificationId) == null) {
            document.getElementById('debug').appendChild(debugItem);
        }
    },
    handleIdeProtocol(ideHandler = {}, element = '', notificationId = this.notificationId) {
        const handler = ideHandler.handler ?? this.ideHandle.handler;
        const path = ideHandler.path ?? this.ideHandle.path;
        const line = ideHandler.line ?? this.ideHandle.line;

        const div = element ? document.getElementById(element) : document.createElement('div');

        let linePath = path;

        if (line) {
            linePath = `${path}:${line}`;
        }

        div.innerHTML = ` 
            <a href="${handler}" title="Open ${path}" class="privacyMode flex mx-3 items-center">
                <div class="w-4 h-4 mr-2 focus:outline-none inline-flex focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 text-blue-500">
                    <svg class="w-full shrink-0 max-h-[16px]" id="629b69df8e81e" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path fill-rule="evenodd" clip-rule="evenodd" d="M5.46402 5.05029C5.46402 4.49801 5.91173 4.05029 6.46402 4.05029L14.9493 4.05029C15.5016 4.05029 15.9493 4.49801 15.9493 5.05029L15.9493 13.5356C15.9493 14.0879 15.5016 14.5356 14.9493 14.5356C14.397 14.5356 13.9493 14.0879 13.9493 13.5356L13.9493 7.46451L5.75691 15.6569C5.36639 16.0474 4.73322 16.0474 4.3427 15.6569C3.95217 15.2664 3.95217 14.6332 4.3427 14.2427L12.5351 6.05029L6.46402 6.05029C5.91173 6.05029 5.46402 5.60258 5.46402 5.05029Z" fill="currentColor"></path>
                    </svg>
                </div>
                <div class="py-2 font-light dark:text-gray-300 text-sm underline text-gray-700 cursor-pointer">
                    <span>${linePath}</span>
                </div>
            </a>
            `;

        this.debugElement(notificationId).appendChild(div);
    },
});
