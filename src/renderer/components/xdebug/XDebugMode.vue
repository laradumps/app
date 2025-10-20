<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import hljs from "highlight.js/lib/core";
import tippy from "tippy.js";
import "tippy.js/dist/tippy.css";
import "tippy.js/themes/light-border.css";
import "tippy.js/themes/light.css";
import XDebugPropertyNode from "@/components/xdebug/XDebugPropertyNode.vue";
import SvgXDebug from "@/components/svg/SvgXDebug.vue";
import DumpLink from "@/components/dumps/DumpLink.vue";
import { useXDebug } from "@/store/xdebug";
import IconContinue from "@/components/Icons/IconContinue.vue";
import IconStepOver from "@/components/Icons/IconStepOver.vue";
import IconStepInto from "@/components/Icons/IconStepInto.vue";
import IconStop from "@/components/Icons/IconStop.vue";
import SplitPanes from "@/components/split/SplitPanes.vue";
import IconLoading from "@/components/Icons/IconLoading.vue";
import { useI18n } from "vue-i18n";

const xDebugStore = useXDebug();
const i18n = useI18n();

const error = ref("");
const transactionId = ref(1);
const initialized = ref(false);

const evaluate = ref("");
const fileContent = ref([]);
const variablesNames = ref([]);
const currentLine = ref("");
const currentFileName = ref("");

const propertiesTree = ref([]);
const propertiesContextTree = ref([]);
const propertiesEvalTree = ref([]);

const inStepCommand = ref(false);
const inMountEvent = ref(false);
const variableClicked = ref(true);
const selectedVariableName = ref("");
const variablesInSidebar = ref(false);

const expandedProperties = ref({});

const loading = ref(false);

const breakpoints = ref([]);

const openXDebugLink = () => {
    window.ipcRenderer.send("main:openLink", "https://xdebug.org");
};

const sendCommand = (cmd) => {
    window.ipcRenderer.send("send-xdebug-command", cmd);
};

const getNextTransactionId = () => {
    return transactionId.value++;
};

const stepInto = () => {
    variableClicked.value = true;
    inStepCommand.value = true;

    const id = getNextTransactionId();
    sendCommand(`step_into -i ${id}`);
    contextGet(id);
};

const stepOver = () => {
    variableClicked.value = true;
    inStepCommand.value = true;

    const id = getNextTransactionId();
    sendCommand(`step_over -i ${id}`);
    contextGet(id);
};

const stop = () => {
    inStepCommand.value = true;

    const id = getNextTransactionId();
    sendCommand(`stop -i ${id}`);

    handleStop();
};

const contextGet = (id) => {
    sendCommand(`context_get -i ${id}`);
};

const continueDebug = () => {
    variableClicked.value = true;
    if (!inMountEvent.value) {
        inStepCommand.value = true;
    }

    const id = getNextTransactionId();

    sendCommand(`run -i ${id}`);
};

const propertyGet = (variableName) => {
    const id = getNextTransactionId();
    sendCommand(`feature_set -i ${id} -n max_children -v 100`);
    sendCommand(`property_get -i ${id} -n ${variableName} -m 0`);
};

const evaluateExpression = () => {
    propertiesEvalTree.value = [];

    setTimeout(() => {
        const id = getNextTransactionId();
        sendCommand(`eval -i ${id} -- ${btoa(evaluate.value)}`);

        setTimeout(() => modal_property_get.showModal(), 200);
    }, 300);
};

const handleResponse = (event, response) => {
    loading.value = true;
    setTimeout(() => parseResponse(response), 100);
};

const handlePropertyContextClick = (type, variable) => {
    if (type === "uninitialized") return;

    propertiesContextTree.value = [];

    if (expandedProperties.value[variable]) {
        expandedProperties.value = { ...expandedProperties.value, [variable]: false };
    } else {
        expandedProperties.value = { ...expandedProperties.value, [variable]: true };
    }

    selectedVariableName.value = variable;
    variablesInSidebar.value = true;

    propertyGet(variable);
};

const handleContextGet = (responseElement) => {
    const properties = responseElement.getElementsByTagName("property");

    variablesNames.value = [];

    Array.from(properties).forEach((property) => {
        const name = property.getAttribute("name");
        let value = property.getAttribute("value") || property.textContent.trim();

        const encoding = property.getAttribute("encoding");
        if (encoding === "base64" && value) {
            try {
                value = atob(value);
            } catch (e) {
                console.error("Erro ao decodificar base64:", e);
                value = property.textContent.trim();
            }
        }

        if (name.startsWith("$")) {
            variablesNames.value.push({
                name,
                classname: property.getAttribute("classname"),
                type: property.getAttribute("type"),
                value
            });
        }
    });

    nextTick(() => tippy("[data-tippy-content]", { allowHTML: true, theme: "light-border", placement: "right-end" }));
};

const formatValue = (property) => {
    if (["bool", "int", "float"].includes(property.type)) {
        return property.value;
    }

    if (property.type === "null") {
        return "null";
    }

    return `"${property.value}"`;
};

const handlePropertyGet = (responseElement, evaluate) => {
    const properties = responseElement.getElementsByTagName("property");

    propertiesTree.value = [];
    propertiesContextTree.value = [];
    propertiesEvalTree.value = [];

    const buildPropertyTree = (propertyElement) => {
        const name = propertyElement.getAttribute("name");
        const fullname = propertyElement.getAttribute("fullname");
        const type = propertyElement.getAttribute("type");
        const facet = propertyElement.getAttribute("facet");
        const classname = propertyElement.getAttribute("classname");

        if (!["null", "int", "string", "float", "bool"].includes(type) && name === selectedVariableName.value) {
            return null;
        }

        let valueElement = propertyElement.querySelector("cdata") || propertyElement;
        let value = propertyElement.getAttribute("value") || valueElement.textContent;

        const encoding = propertyElement.getAttribute("encoding");
        if (encoding === "base64" && value) {
            try {
                value = atob(value);
            } catch (e) {
                console.error("Error decoding base64:", e);
            }
        }

        function formatValue(type, value) {
            if (type === "bool") {
                return value === "1" ? "true" : "false";
            }

            return value;
        }

        const propertyObject = {
            name,
            fullname,
            type,
            classname,
            facet,
            value: formatValue(type, value),
            expanded: false,
            children: []
        };

        const childrenCount = parseInt(propertyElement.getAttribute("numchildren"), 10);
        if (childrenCount > 0) {
            const childProperties = propertyElement.getElementsByTagName("property");
            Array.from(childProperties).forEach((childProperty) => {
                const childPropertyTree = buildPropertyTree(childProperty);
                if (childPropertyTree) {
                    propertyObject.children.push(childPropertyTree);
                }
            });
        }

        if (propertyObject.children.length > 0) {
            propertyObject.children.shift();
        }

        return propertyObject;
    };

    Array.from(properties).forEach((property) => {
        const list = buildPropertyTree(property);
        if (!list) return;

        if (evaluate) {
            propertiesEvalTree.value.push(list);
            return;
        }

        if (variablesInSidebar.value) {
            propertiesContextTree.value.push(list);
            return;
        }

        propertiesTree.value.push(list);
    });
};

const handleFileContent = (messageElement) => {
    let filename = messageElement.getAttribute("filename");
    const lineno = parseInt(messageElement.getAttribute("lineno"), 10);

    currentFileName.value = filename;
    currentLine.value = lineno;

    if (xDebugStore.current.workdir) {
        const projectPath = xDebugStore.current.project_path;

        filename = filename.replace(xDebugStore.current.workdir, projectPath);
    }

    const isWindows = process.platform === "win32";

    ipcRenderer.send("read-file", filename.replace(isWindows ? "file:///" : "file://", ""));

    ipcRenderer.on("file-read-success", (event, data) => {
        nextTick(() => {
            fileContent.value = convertHTMLTextToArray(data);

            setTimeout(() => {
                if (document.getElementById("trace-line")) {
                    document.getElementById("trace-line").scrollIntoView({
                        behavior: "smooth",
                        block: "center"
                    });
                }
            }, 300);
        });
    });

    ipcRenderer.on("file-read-error", (event, errorMessage) => {
        error.value = errorMessage;
        modal_error.showModal();

        console.error("Error reading file:", errorMessage);
    });
};

window.ipcRenderer.on("send-command-error", (event, args) => {
    console.log("command err", args.error);
    handleStop();
});

const handleStop = () => {
    variableClicked.value = true;
    variablesNames.value = [];
    currentLine.value = "";
    currentFileName.value = "";
    propertiesContextTree.value = [];
    propertiesEvalTree.value = [];
    propertiesTree.value = [];
};

const convertHTMLTextToArray = (data) => {
    const result = {};
    const fileContent = data.split("\n");
    const startLine = 0;
    const endLine = fileContent.length;

    for (let i = startLine; i < endLine; i++) {
        result[i + 1] = fileContent[i];
    }

    return result;
};

const setBreakpoints = () => {
    console.log(breakpoints.value);
    breakpoints.value
        .filter((breakpoint) => breakpoint.enabled && breakpoint.line !== null)
        .forEach((breakpoint) => {
            const id = getNextTransactionId();
            const url = breakpoint.url.replace(xDebugStore.current.project_path, xDebugStore.current.workdir);
            const cmd = `breakpoint_set -i ${id} -t line -s enabled -f ${url} -n ${breakpoint.line}`;

            console.log(cmd);
            sendCommand(cmd);
        });
};

const parseResponse = async (xml) => {
    if (variableClicked.value === false) {
        return;
    }

    const xmlParts = xml.split(/(?=<\?xml)/);

    for (const xmlPart of xmlParts) {
        if (!xmlPart.trim()) continue;

        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlPart, "text/xml");

        const initEvent = doc.getElementsByTagName("init");

        if (initEvent.length > 0) {
            initialized.value = true;

            const fileuri = initEvent[0].getAttribute("fileuri");

            console.log("File URI:", fileuri);

            if (fileuri && fileuri.includes("phpcs")) {
                console.log("ignore phpcs");
                continue;
            }

            if (fileuri && fileuri.includes("pest")) {
                console.log("running in pest");
            }

            window.ipcRenderer.send("main:show");

            setTimeout(async () => {
                setBreakpoints(fileuri);
                continueDebug();
            }, 100);
        }

        const messageElement = doc.getElementsByTagName("xdebug:message");

        if (messageElement.length > 0) {
            handleFileContent(messageElement[0]);
        }

        const responseElement = doc.getElementsByTagName("response")[0];

        if (responseElement && !inStepCommand.value) {
            const errorElement = responseElement.getElementsByTagName("error")[0];
            if (errorElement) {
                const errorCode = errorElement.getAttribute("code");
                const errorMessage = errorElement.getElementsByTagName("message")[0].textContent;

                if (errorCode === "4") {
                    console.error(`Error: (${errorCode}): ${errorMessage}`);

                    continue;
                    // return;
                }
            }

            const command = responseElement.getAttribute("command");
            const status = responseElement.getAttribute("status");

            if (command === "breakpoint_set") {
                const success = responseElement.getAttribute("reason");

                if (success === "ok") {
                    // todo
                }
            }

            if (command === "run" && status === "stopping") {
                handleStop();
                continueDebug();
            }

            if (command === "context_get") {
                handleContextGet(responseElement);

                if (status === "stopping") {
                    handleStop();
                    continueDebug();
                }
            }

            if (command === "property_get") {
                handlePropertyGet(responseElement);
            }

            if (command === "eval") {
                handlePropertyGet(responseElement, true);
            }
        }

        if (responseElement) {
            const errorElement = responseElement.getElementsByTagName("error")[0];
            if (errorElement) {
                const errorCode = errorElement.getAttribute("code");
                const errorMessage = errorElement.getElementsByTagName("message")[0].textContent;

                if (errorCode === "4") {
                    console.error(`Error 2 (${errorCode}): ${errorMessage}`);
                    continue;
                }
            }

            const command = responseElement.getAttribute("command");
            const status = responseElement.getAttribute("status");

            if (command === "context_get" && status === "stopping") {
                handleStop();
            }
        }
    }

    loading.value = false;
};

const getHighlightedCode = (lineContent) => {
    const highlightedSyntax = hljs.highlight(lineContent, { language: "php" }).value;

    const regex = new RegExp(
        [...variablesNames.value]
            .map((v) => v.name)
            .sort((a, b) => b.length - a.length)
            .map((n) => n.replace(/[-\/\\^$.*+?()[\]{}|]/g, "\\$&"))
            .join("|"),
        "g"
    );

    return highlightedSyntax.replace(regex, (match) => {
        const variable = variablesNames.value.find((v) => v.name === match);
        if (!variable) return match;

        const classes = variable.type === "uninitialized" ? "opacity-60 line-through" : "cursor-pointer font-normal";
        const tooltip = ["int", "bool", "float"].includes(variable.type) && variable.value !== null ? ` data-tippy-content="${variable.type}: ${variable.value}"` : "";

        return `<span class="highlight ${classes}" data-variable="${match}" onclick="modal_property_get.showModal()"${tooltip}>${match}</span>`;
    });
};

const handleKeyboardEvent = async (event) => {
    switch (event.key) {
        case "F5":
            continueDebug();
            break;
        case "F8":
            stepOver();
            break;
        case "F7":
            stepInto();
            break;
        case "F2":
            stop();
            break;
        default:
            return;
    }
};

const handleClick = (event) => {
    inStepCommand.value = false;
    variableClicked.value = true;
    variablesInSidebar.value = false;
    event.preventDefault();

    const target = event.target;

    if (target.tagName === "SPAN" && target.classList.contains("cursor-pointer")) {
        const variableName = target.getAttribute("data-variable");

        if (variableName) {
            selectedVariableName.value = variableName;

            propertyGet(variableName);
        }
    }
};

const handleError = (event, err) => {
    error.value = err;
    console.error(err);
};

const handleSelectText = () => {
    evaluate.value = window.getSelection().toString().trim();
};

const disconnect = () => {
    xDebugStore.current = {};
    transactionId.value = 0;

    window.ipcRenderer.send("disconnect-xdebug");
    modal_error.close();
};

const shouldShowBreakpoint = (lineNumber) => {
    return breakpoints.value.some((breakpoint) => breakpoint.enabled && breakpoint.line == lineNumber);
};

watch(fileContent, () => {
    inStepCommand.value = false;
    contextGet(transactionId.value);
});

onMounted(() => {
    inMountEvent.value = true;

    window.ipcRenderer.on("xdebug-response", handleResponse);
    window.ipcRenderer.on("xdebug-error", handleError);

    window.addEventListener("keydown", handleKeyboardEvent);

    window.ipcRenderer.on("xdebug-breakpoints", (_, args) => {
        const validBreakpoints = (args || []).filter((breakpoint) => breakpoint.enabled && breakpoint.line !== null);
        breakpoints.value = validBreakpoints;

        validBreakpoints.forEach((breakpoint) => {
            const id = getNextTransactionId();
            const url = breakpoint.url.replace(xDebugStore.current.project_path, xDebugStore.current.workdir);
            const cmd = `breakpoint_set -i ${id} -t line -s enabled -f ${url} -n ${breakpoint.line}`;

            console.log(cmd);
            sendCommand(cmd);
        });
    });
});

const toggleBreakpoint = (ideHandler) => {
    let { file, line } = ideHandler;

    file = file.replace(xDebugStore.current.workdir, "file://" + xDebugStore.current.project_path);

    const breakpointIndex = breakpoints.value.findIndex((bp) => bp.url == file && bp.line == line);

    if (breakpointIndex !== -1) {
        console.log("Removing breakpoint:", file, line);
        breakpoints.value.splice(breakpointIndex, 1);
    } else {
        console.log("Adding breakpoint:", file, line);
        breakpoints.value.push({ url: file, line });
    }
};

onBeforeUnmount(() => {
    window.ipcRenderer.removeListener("xdebug-response", handleResponse);
    window.ipcRenderer.removeListener("xdebug-error", handleError);

    window.removeEventListener("keydown", handleKeyboardEvent);
});
</script>
<template>
    <div>
        <div class="w-full">
            <div class="w-full z-300 top-0 flex px-3 py-2 flex-row gap-1 items-center uppercase text-xs">
                <div class="flex w-full gap-1 items-center justify-between">
                    <div class="flex w-full gap-1 items-center">
                        <button
                            class="btn btn-xs !py-4"
                            @click="continueDebug"
                            :disabled="variablesNames.length === 0"
                            data-tippy-content="Continue (F5)"
                            :class="{ '!bg-transparent': variablesNames.length === 0 }"
                        >
                            <IconContinue :class="{ 'opacity-60': variablesNames.length === 0 }" />
                        </button>

                        <button
                            class="btn btn-xs !py-4"
                            @click="stepOver"
                            :disabled="variablesNames.length === 0"
                            data-tippy-content="Step Over (F8)"
                            :class="{ '!bg-transparent': variablesNames.length === 0 }"
                        >
                            <IconStepOver
                                class="text-info w-4"
                                :class="{ 'opacity-60': variablesNames.length === 0 }"
                            />
                        </button>

                        <button
                            class="btn btn-xs !py-4"
                            @click="stepInto"
                            :disabled="variablesNames.length === 0"
                            data-tippy-content="Step Into (F7)"
                            :class="{ '!bg-transparent': variablesNames.length === 0 }"
                        >
                            <IconStepInto
                                class="w-4 text-warning"
                                :class="{ 'opacity-60': variablesNames.length === 0 }"
                            />
                        </button>
                    </div>

                    <div class="flex gap-2">
                        <IconLoading
                            class="text-base-content/70 w-5"
                            :class="{ 'opacity-100': loading }"
                        />

                        <button
                            class="btn btn-xs !px-1.5"
                            @click="stop"
                            :disabled="variablesNames.length === 0"
                            data-tippy-content="Stop (F2)"
                            :class="{ '!bg-transparent': variablesNames.length === 0 }"
                        >
                            <IconStop
                                class="text-error w-5"
                                :class="{ '!text-gray-500': variablesNames.length === 0 }"
                            />
                        </button>
                    </div>
                </div>
            </div>

            <div class="text-xs">
                <input
                    type="text"
                    v-show="variablesNames.length > 0"
                    @keydown.enter="evaluateExpression"
                    v-model="evaluate"
                    placeholder="evaluate expression"
                    class="input placeholder-opacity-75 text-xs tracking-wider border-base-content/10 rounded-none input-sm w-full"
                />

                <div
                    v-if="variablesNames.length === 0"
                    class="flex h-[calc(100vh-135px)] w-full items-center justify-center"
                >
                    <div
                        type="button"
                        class="select-none flex gap-7 flex-col items-center text-xs tracking-wide"
                    >
                        <SvgXDebug />

                        <div class="flex gap-2">
                            <span
                                class="link"
                                @click="openXDebugLink"
                            >
                                https://xdebug.org
                            </span>

                            (unofficial feature)
                        </div>

                        <div class="space-y-3 text-base-content text-sm font-normal">
                            <li>{{ i18n.t("doc.add") }} <span class="font-semibold">xdebug_break()</span> {{ i18n.t("doc.in_any_line_of_code") }}</li>
                            <li>Shortcuts: <strong>F5</strong>(continue), <strong>F8</strong>(step over) or <strong>F7</strong>(step into)</li>
                        </div>

                        <button
                            @click="disconnect"
                            class="select-none inline-flex h-6 text-sm w-max min-w-max items-center justify-center badge-outline badge badge-warning p-1 transition hover:bg-opacity-50 disabled:opacity-25 !px-2"
                        >
                            <span class="text-xs">Disconnect</span>
                        </button>
                    </div>
                </div>

                <div
                    v-else
                    class="flex xdebug flex-row gap-3 w-full h-[calc(100vh-142px)]"
                >
                    <SplitPanes
                        orientation="vertical"
                        :initial-split="60"
                    >
                        <template #pane-a>
                            <div
                                v-show="variablesNames.length > 0"
                                class="pane-code-container mb-0 border-x border-base-content/20 overflow-auto w-full"
                            >
                                <div
                                    v-for="(lineContent, lineNumber) in fileContent"
                                    :key="`${lineNumber}-${currentFileName}`"
                                    class="flex text-sm font-normal items-center hover:!bg-red-500/10 px-3 group/line"
                                    :class="{ 'bg-red-500/20': parseInt(lineNumber) === currentLine }"
                                    :id="parseInt(lineNumber) === currentLine ? `trace-line` : null"
                                >
                                    <DumpLink
                                        @toggleBreakpoint="toggleBreakpoint"
                                        class="flex font-normal h-full text-xs"
                                        :label="lineNumber"
                                        :show-icon="true"
                                        :breakpoint="shouldShowBreakpoint(lineNumber)"
                                        :ide-handler="{
                                            workdir: xDebugStore.current.workdir,
                                            project_path: xDebugStore.current.project_path,
                                            real_path: currentFileName.replace('file:\/\/', ''),
                                            line: lineNumber,
                                            class_name: '',
                                            separator: xDebugStore.current.separator,
                                            wsl_config: xDebugStore.current.wsl_config
                                        }"
                                    />

                                    <span
                                        class="language-php tracking-wide whitespace-pre hljs h-full"
                                        v-if="variablesNames.length > 0"
                                        v-html="getHighlightedCode(lineContent)"
                                        @click="handleClick"
                                        @mouseup="handleSelectText"
                                    ></span>
                                    <div></div>
                                </div>
                            </div>
                        </template>

                        <template #pane-b>
                            <div class="overflow-auto text-sm h-fill-available">
                                <div
                                    v-for="property in variablesNames"
                                    :key="property.name + '-' + property.type"
                                >
                                    <div
                                        :class="{
                                            'cursor-pointer': !['int', 'bool', 'string'].includes(property.type),
                                            '!cursor-default flex-wrap': ['string', 'uninitialized'].includes(property.type),
                                            'bg-gray-800 border-l-4 !border-[#d19a66]': expandedProperties[property.name]
                                        }"
                                        class="flex border-l-4 border-transparent hover:bg-gray-700 items-center px-1 py-2 pl-3"
                                        @click="!['int', 'bool', 'string'].includes(property.type) ? handlePropertyContextClick(property.type, property.name) : null"
                                    >
                                        <span
                                            :class="{ 'opacity-60 line-through': property.type === 'uninitialized' }"
                                            class="variable-name mr-2"
                                            >{{ property.name }}</span
                                        >
                                        <span class="classname">
                                            <span class="truncate">{{ " {" + (property.classname ?? property.type) + "}" }}</span>
                                            <span v-if="!['uninitialized', 'object', 'array'].includes(property.type)">
                                                =
                                                <span class="text-secondary">{{ formatValue(property) }}</span>
                                            </span>
                                        </span>
                                    </div>

                                    <template
                                        v-if="expandedProperties[property.name]"
                                        :key="expandedProperties + '-' + property.name"
                                        class="py-2"
                                    >
                                        <XDebugPropertyNode
                                            v-if="propertiesTree"
                                            v-for="property in propertiesContextTree"
                                            :key="'child-' + property.name + '-' + property.type"
                                            :property="property"
                                            :transition-id="transactionId"
                                            @click="variableClicked = false"
                                        />
                                    </template>
                                </div>
                            </div>
                        </template>
                    </SplitPanes>

                    <div class="fixed bottom-0 break-all border-b mt-1 border-base-content/20 py-1 px-3 text-base-content/60">{{ currentFileName }}:{{ currentLine }}</div>
                </div>
            </div>
        </div>

        <dialog
            id="modal_property_get"
            class="modal modal-middle"
        >
            <div class="modal-box !rounded-md w-9/12 max-w-4xl space-y-3">
                <div
                    class="flex gap-3 text-sm"
                    v-if="selectedVariableName && propertiesEvalTree.length === 0"
                >
                    <div class="select-none">
                        <span class="variable-name text-base">{{ selectedVariableName }}</span>
                    </div>
                </div>

                <div
                    class="flex gap-3 text-sm"
                    v-if="propertiesEvalTree.length > 0"
                >
                    <span
                        class="variable-name"
                        v-text="evaluate"
                    ></span>
                </div>

                <div class="w-full text-xs overflow-auto -mt-1">
                    <XDebugPropertyNode
                        v-if="propertiesTree"
                        v-for="property in propertiesTree"
                        :key="'propertiesTree-' + property.name + '-' + property.type"
                        :property="property"
                        :transition-id="transactionId"
                        @click="variableClicked = false"
                    />

                    <XDebugPropertyNode
                        v-if="propertiesTree"
                        v-for="property in propertiesContextTree"
                        :key="'propertiesContextTree-' + property.name + '-' + property.type"
                        :property="property"
                        :transition-id="transactionId"
                        @click="variableClicked = false"
                    />

                    <XDebugPropertyNode
                        v-if="propertiesTree"
                        v-for="property in propertiesEvalTree"
                        :key="'propertiesEvalTree-' + property.name + '-' + property.type"
                        :property="property"
                        :transition-id="transactionId"
                        @click="variableClicked = false"
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

::v-deep(.classname) {
    @apply text-gray-400;
}

::v-deep([data-tippy-root]) {
    @apply break-all;
}

::v-deep(.xdebug .hljs) {
    @apply !bg-transparent font-light text-sm leading-8 tracking-wider;
}

::v-deep(.xdebug .hljs),
::v-deep(.xdebug .hljs-params) {
    color: rgba(171, 178, 191, 0.9);
}

::v-deep(.xdebug .hljs-comment),
::v-deep(.xdebug .hljs-quote) {
    color: #5c6370;
    font-style: italic;
}

::v-deep(.xdebug .hljs-doctag),
::v-deep(.xdebug .hljs-formula),
::v-deep(.xdebug .hljs-keyword) {
    color: #c678dd !important;
}

::v-deep(.xdebug .hljs-deletion),
::v-deep(.xdebug .hljs-name),
::v-deep(.xdebug .hljs-section),
::v-deep(.xdebug .hljs-selector-tag),
::v-deep(.xdebug .hljs-subst) {
    color: #e06c75 !important;
}

::v-deep(.xdebug .hljs-literal) {
    color: #56b6c2 !important;
}

::v-deep(.xdebug .hljs-addition),
::v-deep(.xdebug .hljs-attribute),
::v-deep(.xdebug .hljs-meta .hljs-string),
::v-deep(.xdebug .hljs-regexp),
::v-deep(.xdebug .hljs-string) {
    color: #98c379 !important;
}

::v-deep(.xdebug .hljs-bullet),
::v-deep(.xdebug .hljs-link),
::v-deep(.xdebug .hljs-meta),
::v-deep(.xdebug .hljs-selector-id),
::v-deep(.xdebug .hljs-symbol),
::v-deep(.xdebug .hljs-title) {
    color: #61aeee !important;
}

::v-deep(.xdebug .hljs-built_in),
::v-deep(.xdebug .hljs-class .hljs-title),
::v-deep(.xdebug .hljs-title.class_) {
    color: #e6c07b !important;
}

::v-deep(.xdebug .hljs-emphasis) {
    font-style: italic !important;
}

::v-deep(.xdebug .hljs-strong) {
    font-weight: 700 !important;
}

::v-deep(.xdebug .hljs-link) {
    text-decoration: underline !important;
}
</style>
