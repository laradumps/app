<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue';
import hljs from 'highlight.js/lib/core';
import tippy, { delegate } from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import 'tippy.js/themes/light-border.css';
import 'tippy.js/themes/light.css';
import XDebugPropertyNode from '@/components/xdebug/XDebugPropertyNode.vue';
import SvgXDebug from '@/components/svg/SvgXDebug.vue';
import DumpLink from '@/components/dumps/DumpLink.vue';
import { useXDebug } from '@/store/xdebug';
import IconContinue from '@/components/Icons/IconContinue.vue';
import IconStepOver from '@/components/Icons/IconStepOver.vue';
import IconStepInto from '@/components/Icons/IconStepInto.vue';
import IconStop from '@/components/Icons/IconStop.vue';
import SplitPanes from '@/components/split/SplitPanes.vue';
import { useI18n } from 'vue-i18n';
import { escapeHtml } from '@/utils/helpers';
import { encodeBase64, formatValue, parseProperty, quoteArg } from './dbgp';

const xDebugStore = useXDebug();
const i18n = useI18n();

const root = ref(null);
const error = ref('');
const evaluate = ref('');
const lines = ref([]);
const variables = ref([]);
const openVariables = ref({});
const currentLine = ref(0);
const currentFileName = ref('');
const running = ref(false);
const breakpoints = ref([]);
const modal = ref({ title: '', tree: [], error: '' });

const paused = computed(() => currentFileName.value !== '');

let active = false;
let nextId = 1;
const pending = new Map();
const engineBreakpoints = new Map();
const hiddenIdeBreakpoints = new Set();

const toLocal = (uri) => {
    const { workdir, project_path } = xDebugStore.current;
    return workdir ? uri.replace(workdir, project_path) : uri;
};

const toRemote = (uri) => {
    const { workdir, project_path } = xDebugStore.current;
    return workdir ? uri.replace(project_path, workdir) : uri;
};

const currentFileUrl = computed(() => toLocal(currentFileName.value));

const relativeFileName = computed(() =>
    currentFileUrl.value.replace(/^file:\/\//, '').replace(xDebugStore.current.project_path, '')
);

const statusLabel = computed(() => {
    if (running.value) return 'Running…';
    if (paused.value) return 'Paused';

    return `Listening on :${xDebugStore.current.client_port}`;
});

const openXDebugLink = () => {
    window.ipcRenderer.send('main:openLink', 'https://xdebug.org');
};

const command = (name, args = '') => {
    const id = String(nextId++);
    window.ipcRenderer.send('send-xdebug-command', `${name} -i ${id} ${args}`.trim());

    return new Promise((resolve) => pending.set(id, resolve));
};

const getProperty = async (fullname) => {
    const response = await command('property_get', `-n ${quoteArg(fullname)} -m 0`);
    const property = response.getElementsByTagName('property')[0];

    return property ? parseProperty(property) : null;
};

provide('xdebug:get-property', getProperty);

const handleResponse = (_, xml) => {
    const doc = new DOMParser().parseFromString(xml, 'text/xml');

    const init = doc.getElementsByTagName('init')[0];
    if (init) return startSession(init.getAttribute('fileuri'));

    const response = doc.getElementsByTagName('response')[0];
    const id = response?.getAttribute('transaction_id');

    pending.get(id)?.(response);
    pending.delete(id);
};

const startSession = (fileuri) => {
    pending.clear();
    engineBreakpoints.clear();
    running.value = false;

    if (fileuri?.includes('phpcs')) return command('detach');

    active = true;
    command('feature_set', '-n max_children -v 100');
    syncBreakpoints();
    resume('run');
};

const resume = async (name) => {
    running.value = true;
    const response = await command(name);
    running.value = false;

    const status = response.getAttribute('status');

    if (status === 'stopping') {
        handleStop();
        return command('run');
    }

    if (status !== 'break') return handleStop();

    window.ipcRenderer.send('main:show');

    const message = response.getElementsByTagName('xdebug:message')[0];
    await showFile(message.getAttribute('filename'), Number(message.getAttribute('lineno')));

    const context = await command('context_get');
    variables.value = Array.from(context.children).map(parseProperty);

    await nextTick();
    document.getElementById('trace-line')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

const stop = () => {
    command('stop').then(() => command('run'));
    handleStop();
};

const showFile = async (filename, line) => {
    currentFileName.value = filename;
    currentLine.value = line;

    try {
        const path = toLocal(filename).replace(process.platform === 'win32' ? 'file:///' : 'file://', '');
        lines.value = (await window.ipcRenderer.invoke('read-file', path)).split('\n');
    } catch (e) {
        error.value = e.message;
        modal_error.showModal();
    }
};

const handleStop = () => {
    active = false;
    running.value = false;
    variables.value = [];
    lines.value = [];
    currentLine.value = 0;
    currentFileName.value = '';
};

const showProperty = async (title, name, args) => {
    modal.value = { title, tree: [], error: '' };
    modal_property_get.showModal();

    const response = await command(name, args);
    const property = response.getElementsByTagName('property')[0];

    if (!property) {
        modal.value.error = response.getElementsByTagName('error')[0]?.textContent ?? '';
        return;
    }

    const node = parseProperty(property);
    modal.value.tree = node.children.length ? node.children : [node];
};

const inspect = (name) => showProperty(name, 'property_get', `-n ${quoteArg(name)} -m 0`);

const evaluateExpression = () => {
    if (evaluate.value) showProperty(evaluate.value, 'eval', `-- ${encodeBase64(evaluate.value)}`);
};

const toggleVariable = (name) => {
    openVariables.value = { ...openVariables.value, [name]: !openVariables.value[name] };
};

const highlightedLines = computed(() => lines.value.map((line) => hljs.highlight(line, { language: 'php' }).value));

const variableMatcher = computed(() => {
    const names = variables.value
        .map((variable) => variable.name.replace(/[-\/\\^$.*+?()[\]{}|]/g, '\\$&'))
        .sort((a, b) => b.length - a.length);

    return names.length ? new RegExp(`(${names.join('|')})(?!\\w)`, 'g') : null;
});

const withVariables = (html) => {
    if (!variableMatcher.value) return html;

    return html.replace(variableMatcher.value, (name) => {
        const variable = variables.value.find((v) => v.name === name);
        const value = formatValue(variable);
        const classes = variable.type === 'uninitialized' ? 'opacity-60 line-through' : 'cursor-pointer font-normal';
        const tooltip = value !== null ? ` data-tippy-content="${escapeHtml(`${variable.type}: ${value}`)}"` : '';

        return `<span class="highlight ${classes}" data-variable="${name}"${tooltip}>${name}</span>`;
    });
};

const handleCodeClick = (event) => {
    const name = event.target.closest('.cursor-pointer[data-variable]')?.dataset.variable;
    if (name) inspect(name);
};

const handleSelectText = () => {
    evaluate.value = window.getSelection().toString().trim();
};

const SHORTCUTS = { F5: 'run', F8: 'step_over', F7: 'step_into' };

const handleKeyboardEvent = (event) => {
    if (!paused.value || running.value) return;
    if (event.key === 'F2') return stop();
    if (SHORTCUTS[event.key]) resume(SHORTCUTS[event.key]);
};

const handleError = (_, err) => {
    error.value = err;
    console.error(err);
    handleStop();
};

const handleCommandError = (_, args) => {
    console.error('Xdebug command error:', args.error);
    handleStop();
};

const disconnect = () => {
    xDebugStore.current = {};
    window.ipcRenderer.send('disconnect-xdebug');
    modal_error.close();
};

const breakpointKey = ({ url, line }) => `${url}:${line}`;

const hasBreakpoint = (line) => breakpoints.value.some((bp) => bp.url === currentFileUrl.value && bp.line === line);

const toggleBreakpoint = (line) => {
    const breakpoint = { url: currentFileUrl.value, line, enabled: true, manual: true };
    const index = breakpoints.value.findIndex((bp) => breakpointKey(bp) === breakpointKey(breakpoint));

    if (index === -1) {
        hiddenIdeBreakpoints.delete(breakpointKey(breakpoint));
        breakpoints.value.push(breakpoint);
        return;
    }

    const [removed] = breakpoints.value.splice(index, 1);
    if (!removed.manual) hiddenIdeBreakpoints.add(breakpointKey(removed));
};

const setIdeBreakpoints = (_, list = []) => {
    const ide = list.filter((bp) => !hiddenIdeBreakpoints.has(breakpointKey(bp)));
    const ideKeys = new Set(ide.map(breakpointKey));

    breakpoints.value = [...ide, ...breakpoints.value.filter((bp) => bp.manual && !ideKeys.has(breakpointKey(bp)))];
};

const syncBreakpoints = () => {
    if (!active) return;

    const wanted = new Set(breakpoints.value.map(breakpointKey));

    for (const [key, id] of engineBreakpoints) {
        if (wanted.has(key)) continue;
        engineBreakpoints.delete(key);
        if (id) command('breakpoint_remove', `-d ${id}`);
    }

    for (const breakpoint of breakpoints.value) {
        const key = breakpointKey(breakpoint);
        if (engineBreakpoints.has(key)) continue;

        engineBreakpoints.set(key, null);
        command('breakpoint_set', `-t line -f ${quoteArg(toRemote(breakpoint.url))} -n ${breakpoint.line}`).then(
            (response) => {
                const id = response.getAttribute('id');
                if (engineBreakpoints.has(key)) engineBreakpoints.set(key, id);
                else if (id) command('breakpoint_remove', `-d ${id}`);
            }
        );
    }
};

watch(breakpoints, syncBreakpoints, { deep: true });

let tooltips = [];

onMounted(async () => {
    window.ipcRenderer.on('xdebug-response', handleResponse);
    window.ipcRenderer.on('xdebug-error', handleError);
    window.ipcRenderer.on('send-command-error', handleCommandError);
    window.ipcRenderer.on('xdebug-breakpoints', setIdeBreakpoints);
    window.addEventListener('keydown', handleKeyboardEvent);

    tooltips = [
        ...tippy('.xdebug-controls [data-tippy-content]', {
            theme: 'ld',
            placement: 'bottom',
            delay: [150, 0],
            appendTo: () => document.body
        }),
        delegate(root.value, {
            target: '.hljs [data-tippy-content]',
            allowHTML: false,
            theme: 'ld',
            placement: 'top',
            offset: [0, 6],
            appendTo: () => document.body
        })
    ];

    setIdeBreakpoints(null, await window.ipcRenderer.invoke('xdebug:get-breakpoints'));
});

onBeforeUnmount(() => {
    window.ipcRenderer.removeListener('xdebug-response', handleResponse);
    window.ipcRenderer.removeListener('xdebug-error', handleError);
    window.ipcRenderer.removeListener('send-command-error', handleCommandError);
    window.ipcRenderer.removeListener('xdebug-breakpoints', setIdeBreakpoints);
    window.removeEventListener('keydown', handleKeyboardEvent);
    tooltips.forEach((tooltip) => tooltip.destroy());
});
</script>
<template>
    <div
        ref="root"
        class="absolute inset-0 flex flex-col"
    >
        <div class="flex min-h-0 flex-1 flex-col">
            <div
                class="xdebug-controls flex shrink-0 items-center gap-3 border-b border-base-content/10 px-3 py-1.5 text-xs"
            >
                <div class="flex items-center gap-0.5 rounded-lg border border-base-content/10 bg-base-content/5 p-0.5">
                    <button
                        class="xdebug-btn"
                        @click="resume('run')"
                        :disabled="!paused || running"
                        data-tippy-content="Continue (F5)"
                    >
                        <IconContinue class="w-4" />
                        <span class="xdebug-btn-label">Continue</span>
                    </button>

                    <button
                        class="xdebug-btn"
                        @click="resume('step_over')"
                        :disabled="!paused || running"
                        data-tippy-content="Step Over (F8)"
                    >
                        <IconStepOver class="w-4 text-info" />
                        <span class="xdebug-btn-label">Step over</span>
                    </button>

                    <button
                        class="xdebug-btn"
                        @click="resume('step_into')"
                        :disabled="!paused || running"
                        data-tippy-content="Step Into (F7)"
                    >
                        <IconStepInto class="w-4 text-warning" />
                        <span class="xdebug-btn-label">Step into</span>
                    </button>

                    <span class="mx-0.5 h-4 w-px bg-base-content/10"></span>

                    <button
                        class="xdebug-btn"
                        @click="stop"
                        :disabled="!paused || running"
                        data-tippy-content="Stop (F2)"
                    >
                        <IconStop class="w-4 text-error" />
                        <span class="xdebug-btn-label">Stop</span>
                    </button>
                </div>

                <div
                    class="flex min-w-0 items-center gap-2 text-base-content/70"
                    :title="`${xDebugStore.current.client_host}:${xDebugStore.current.client_port}`"
                >
                    <span
                        class="size-2 shrink-0 rounded-full"
                        :class="running ? 'bg-info animate-pulse' : paused ? 'bg-warning' : 'bg-success animate-pulse'"
                    ></span>
                    <span class="truncate">{{ statusLabel }}</span>
                </div>

                <button
                    class="btn btn-ghost btn-xs ml-auto font-normal text-base-content/70"
                    @click="disconnect"
                >
                    Disconnect
                </button>
            </div>

            <div class="flex min-h-0 flex-1 flex-col text-xs">
                <input
                    type="text"
                    v-show="paused"
                    @keydown.enter="evaluateExpression"
                    v-model="evaluate"
                    placeholder="Evaluate expression (Enter)"
                    class="input shrink-0 placeholder-opacity-75 text-xs tracking-wider border-base-content/10 rounded-none input-sm w-full"
                />

                <div
                    v-if="!paused"
                    class="flex min-h-0 flex-1 overflow-auto px-4 py-6"
                >
                    <div class="m-auto flex w-full max-w-md select-none flex-col items-center gap-6 text-sm">
                        <div class="flex flex-col items-center gap-2">
                            <SvgXDebug />
                            <span class="text-xs text-base-content/50">
                                <span
                                    class="link"
                                    @click="openXDebugLink"
                                    >xdebug.org</span
                                >
                                · unofficial feature
                            </span>
                        </div>

                        <ol
                            class="w-full space-y-4 rounded-lg border border-base-content/10 bg-base-content/5 p-5 leading-relaxed text-base-content/70"
                        >
                            <li class="flex gap-3">
                                <span
                                    class="flex size-5 shrink-0 items-center justify-center rounded-full bg-base-content/10 text-xs font-semibold text-base-content"
                                    >1</span
                                >
                                <div class="space-y-1">
                                    <p class="font-medium text-base-content">Pause your code</p>
                                    <p>
                                        {{ i18n.t('doc.add') }}
                                        <code
                                            class="rounded bg-base-content/10 px-1 font-mono text-xs text-base-content"
                                            >xdebug_break()</code
                                        >
                                        {{ i18n.t('doc.in_any_line_of_code') }}, or set a breakpoint in PhpStorm (read
                                        from
                                        <code
                                            class="rounded bg-base-content/10 px-1 font-mono text-xs text-base-content"
                                            >.idea/workspace.xml</code
                                        >).
                                    </p>
                                </div>
                            </li>
                            <li class="flex gap-3">
                                <span
                                    class="flex size-5 shrink-0 items-center justify-center rounded-full bg-base-content/10 text-xs font-semibold text-base-content"
                                    >2</span
                                >
                                <div class="space-y-1">
                                    <p class="font-medium text-base-content">Start the request with Xdebug</p>
                                    <p>
                                        Append
                                        <code
                                            class="rounded bg-base-content/10 px-1 font-mono text-xs text-base-content"
                                            >?XDEBUG_TRIGGER=1</code
                                        >
                                        to the URL, or set
                                        <code
                                            class="rounded bg-base-content/10 px-1 font-mono text-xs text-base-content"
                                            >xdebug.start_with_request=yes</code
                                        >.
                                    </p>
                                </div>
                            </li>
                        </ol>

                        <div class="flex flex-col items-center gap-2 text-xs text-base-content/60">
                            <div class="flex flex-wrap justify-center gap-x-4 gap-y-2">
                                <span><kbd class="kbd kbd-xs">F5</kbd> Continue</span>
                                <span><kbd class="kbd kbd-xs">F8</kbd> Step over</span>
                                <span><kbd class="kbd kbd-xs">F7</kbd> Step into</span>
                                <span><kbd class="kbd kbd-xs">F2</kbd> Stop</span>
                            </div>
                            <span class="text-base-content/50">Click a line number to toggle a breakpoint.</span>
                        </div>
                    </div>
                </div>

                <div
                    v-else
                    class="xdebug flex min-h-0 w-full flex-1"
                >
                    <SplitPanes
                        orientation="vertical"
                        :initial-split="60"
                    >
                        <template #pane-a>
                            <div
                                class="flex h-8 shrink-0 items-center border-x border-b border-base-content/10 px-3 text-base-content/70"
                                :title="`${currentFileName}:${currentLine}`"
                            >
                                <span class="truncate">{{ relativeFileName }}</span>
                                <span class="shrink-0 text-base-content/40">:{{ currentLine }}</span>
                            </div>

                            <div
                                class="pane-code-container min-h-0 flex-1 border-x border-base-content/10 overflow-auto"
                            >
                                <div
                                    v-for="(html, index) in highlightedLines"
                                    :key="`${index}-${currentFileName}`"
                                    class="flex text-sm font-normal items-center hover:!bg-red-500/10 px-3 group/line"
                                    :class="{ 'bg-red-500/20': index + 1 === currentLine }"
                                    :id="index + 1 === currentLine ? 'trace-line' : null"
                                >
                                    <DumpLink
                                        class="flex font-normal h-full text-xs cursor-pointer"
                                        :label="String(index + 1)"
                                        :show-icon="true"
                                        :breakpoint="hasBreakpoint(index + 1)"
                                        :ide-handler="{
                                            workdir: xDebugStore.current.workdir,
                                            project_path: xDebugStore.current.project_path,
                                            real_path: currentFileName.replace('file://', ''),
                                            line: index + 1,
                                            class_name: '',
                                            separator: xDebugStore.current.separator,
                                            wsl_config: xDebugStore.current.wsl_config
                                        }"
                                        @click="!$event.target.closest('a') && toggleBreakpoint(index + 1)"
                                    />

                                    <span
                                        class="language-php tracking-wide whitespace-pre hljs h-full"
                                        v-html="withVariables(html)"
                                        @click="handleCodeClick"
                                        @mouseup="handleSelectText"
                                    ></span>
                                </div>
                            </div>
                        </template>

                        <template #pane-b>
                            <div
                                class="flex h-8 shrink-0 items-center gap-1.5 border-b border-base-content/10 px-3 text-base-content/70"
                            >
                                Variables
                                <span class="text-base-content/40">{{ variables.length }}</span>
                            </div>

                            <div class="xdebug-variables min-h-0 flex-1 overflow-auto text-sm">
                                <div
                                    v-for="property in variables"
                                    :key="property.name"
                                >
                                    <div
                                        :class="{
                                            'cursor-pointer': property.numchildren > 0,
                                            'flex-wrap': !property.numchildren,
                                            'bg-gray-800 !border-[#d19a66]': openVariables[property.name]
                                        }"
                                        class="flex border-l-4 border-transparent hover:bg-gray-700 items-center px-1 py-2 pl-3"
                                        @click="property.numchildren > 0 && toggleVariable(property.name)"
                                    >
                                        <span
                                            :class="{ 'opacity-60 line-through': property.type === 'uninitialized' }"
                                            class="variable-name mr-2"
                                            >{{ property.name }}</span
                                        >
                                        <span class="classname">
                                            <span class="truncate">{{
                                                ' {' + (property.classname ?? property.type) + '}'
                                            }}</span>
                                            <span v-if="formatValue(property) !== null">
                                                =
                                                <span class="text-secondary">{{ formatValue(property) }}</span>
                                            </span>
                                        </span>
                                    </div>

                                    <div v-if="openVariables[property.name]">
                                        <XDebugPropertyNode
                                            v-for="child in property.children"
                                            :key="child.fullname"
                                            :property="child"
                                        />
                                    </div>
                                </div>
                            </div>
                        </template>
                    </SplitPanes>
                </div>
            </div>
        </div>

        <dialog
            id="modal_property_get"
            class="modal modal-middle"
        >
            <div class="modal-box !rounded-md w-9/12 max-w-4xl space-y-3">
                <div class="flex gap-3 text-sm select-none">
                    <span class="variable-name text-base">{{ modal.title }}</span>
                </div>

                <p
                    v-if="modal.error"
                    class="text-error text-xs"
                >
                    {{ modal.error }}
                </p>

                <div class="w-full text-xs overflow-auto -mt-1">
                    <XDebugPropertyNode
                        v-for="property in modal.tree"
                        :key="property.fullname ?? property.name"
                        :property="property"
                    />
                </div>
            </div>
            <form
                method="dialog"
                class="modal-backdrop"
            >
                <button>close</button>
            </form>
        </dialog>

        <dialog
            id="modal_error"
            class="modal modal-middle"
        >
            <div class="modal-box !rounded-md text-sm w-9/12 max-w-4xl space-y-3">
                <h3 class="text-error">Error</h3>
                <div class="w-full overflow-auto -mt-1 break-all">
                    {{ error }}
                </div>

                <span class="alert alert-warning">Did you select the right project?</span>

                <div class="modal-action">
                    <form method="dialog">
                        <button
                            class="btn"
                            @click="disconnect"
                        >
                            Close
                        </button>
                    </form>
                </div>
            </div>
        </dialog>
    </div>
</template>

<style>
@reference "./../../styles.css";

.variable-name {
    @apply text-[#61aeee];
}

.xdebug-btn {
    @apply inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1 text-base-content/80 transition-colors;
}

@media (max-width: 560px) {
    .xdebug-btn-label {
        display: none;
    }
}

.xdebug-btn:hover:not(:disabled) {
    @apply bg-base-content/10;
}

.xdebug-btn:disabled {
    @apply cursor-not-allowed opacity-40;
}

/* Opaque tooltip theme so glass/vibrancy does not bleed through and wash out the text */
.tippy-box[data-theme~='ld'] {
    background-color: #1a1f29;
    color: #e5e7eb;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 6px;
    font-size: 11px;
    line-height: 1.4;
    padding: 1px 3px;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.55);
    word-break: break-all;
}

.tippy-box[data-theme~='ld'] > .tippy-arrow {
    color: #1a1f29;
}

.tippy-box[data-theme~='ld'] > .tippy-svg-arrow {
    fill: #1a1f29;
}
</style>
