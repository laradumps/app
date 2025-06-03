<script lang="ts" setup>
import { computed, markRaw, nextTick, onBeforeMount, onBeforeUnmount, onMounted, ref } from "vue";
import TheUpdateModalInfo from "@/components/TheUpdateModalInfo.vue";
import { useScreenStore } from "@/store/screen";
import { useI18nStore } from "@/store/i18n";
import { useTimeStore } from "@/store/time";
import { useGlobalSearchStore } from "@/store/global-search";
import { useI18n } from "vue-i18n";
import { useColorStore } from "@/store/colors";
import { Payload, ScreenPayload } from "@/types/Payload";
import DumpItem from "@/components/DumpItem.vue";
import WelcomePage from "@/components/WelcomePage.vue";
import Screens from "@/components/Screens.vue";
import TheAppUpdateInfo from "@/components/TheAppUpdateInfo.vue";
import DumpLivewire from "@/components/DumpLivewire.vue";
import ScreenWindow from "@/components/ScreenWindow.vue";
import { usePayloadStore } from "@/store/payload";
import { useSettingsStore } from "@/store/settings";
import XDebugMode from "@/components/XDebugMode.vue";
import { useXDebug } from "@/store/xdebug";
import JobView from "@/components/laravel/JobView.vue";
import { useJobStore } from "@/store/jobs";
import { useMailStore } from "@/store/mail";
import MailView from "@/components/laravel/MailView.vue";
import { useLogStore } from "@/store/logs";
import LogView from "@/components/laravel/LogView.vue";
import IconExternalLink from "@/components/Icons/IconExternalLink.vue";
import { useQueriesPayloadStore } from "@/store/queries";
import QueriesView from "@/components/laravel/QueriesView.vue";
import { deepClone } from "@/lib/deep_clone";
import { usePausePayloadStore } from "@/store/pause";
import tippy from "tippy.js";
import { useQueriesBlockedStore } from "@/store/queries-blocked";
import { usePendingRequestsStore } from "@/store/pending-requests";
import { usePauseQueriesStore } from "@/store/pause-queries";
import { ArrowsRightLeftIcon } from "@heroicons/vue/24/solid";
import { useCurrentProject } from "@/store/current-project";
import SvgEmpty from "@/components/Svg/SvgEmpty.vue";

markRaw(TheUpdateModalInfo);

const xDebugStore = useXDebug();
const screenStore = useScreenStore();
const timeStore = useTimeStore();
const colorStore = useColorStore();
const globalSearchStore = useGlobalSearchStore();
const payloadStore = usePayloadStore();
const settingsStore = useSettingsStore();
const logStore = useLogStore();
const queriesStore = useQueriesPayloadStore();
const pausePayloadStore = usePausePayloadStore();

const { locale } = useI18n({ useScope: "global" });
const localeStore = useI18nStore();
const jobStore = useJobStore();
const mailStore = useMailStore();
const pendingRequestsStore = usePendingRequestsStore();
const blockedStore = useQueriesBlockedStore();
const pauseQueries = usePauseQueriesStore();
const currentProjectStore = useCurrentProject();

const defaultScreen = ref({
    screen_name: "home",
    raise_in: 0,
    visible: true,
    pinned: false,
    new_window: false
});

const inScreenWindow = ref("");
const payloadScreen = ref([]);
const jobScreen = ref({});
const mailScreen = ref([]);
const logScreen = ref({});
const queriesScreen = ref([]);
const applicationPath = ref("");
const livewireRequests = ref([]);

const xdebugMode = ref(false);

onBeforeMount(() => {
    locale.value = localeStore.value;
});

onBeforeUnmount(() => {
    [
        "dump",
        "livewire",
        "jobs",
        "html",
        "mailable",
        "table_v2",
        "mail",
        "label",
        "table",
        "http-client",
        "model",
        "log_application",
        "color",
        "screen",
        "json_validate",
        "validate",
        "json",
        "queries",
        "query",
        "time_track"
    ].forEach((event) => {
        window.ipcRenderer.removeAllListeners(event);
    });
});

onMounted(() => {
    if (xDebugStore.current) {
        xdebugMode.value = typeof xDebugStore.current.project_path !== "undefined";
    }

    addScreen(defaultScreen.value);

    window.ipcRenderer.on("dump", (event, { content }) => {
        dispatch(content);
    });

    window.ipcRenderer.send("main:app-version");

    window.ipcRenderer.on("main:app-version.reply", (event, arg) => {
        document.title = "LaraDumps - " + `v${arg.version}`;
    });

    window.ipcRenderer.on("app:screen-window-enable", async (event, args) => {
        inScreenWindow.value = args.screen;
        payloadScreen.value = args.payload;
        jobScreen.value = args.jobs;
        mailScreen.value = args.mails;
        logScreen.value = args.logs;
        queriesScreen.value = args.queries;

        setTimeout(() => (document.title = "LaraDumps - " + args.screen), 200);
    });

    window.ipcRenderer.on("app:screen-window-update", async (event, args) => {
        payloadScreen.value = args.payload;
        jobScreen.value = args.jobs;
        mailScreen.value = args.mails;
        logScreen.value = args.logs;
        queriesScreen.value = args.queries;
    });

    window.ipcRenderer.send("local-shortcut:get");

    window.ipcRenderer.on("xdebug-connected", (event, arg) => {
        xdebugMode.value = true;
    });

    window.ipcRenderer.on("xdebug-disconnected", (event, arg) => {
        if (xDebugStore.current) {
            xDebugStore.current.project_path = "";
        }
        xdebugMode.value = false;
    });

    window.ipcRenderer.on("xdebug", (event, { content }) => dispatch(content));

    dumpListeners();

    window.ipcRenderer.send("storage.get");

    toggleScreen("home");

    window.addEventListener("add-screen", (event: Event) => {
        const detail = (event as CustomEvent).detail as string[];

        if (detail.selected) {
            addScreen({
                screen_name: detail.value.replace("_", " "),
                raise_in: 0,
                visible: true,
                pinned: false,
                new_window: false
            });
        } else {
            screenStore.remove(detail.value);
        }
    });
});

const dumpListeners = () => {
    window.ipcRenderer.on("livewire", (event, { content }) => {
        if (pausePayloadStore.is_paused) {
            return;
        }

        if (applicationPath.value != content.application_path) {
            window.ipcRenderer.send("storage.check", {
                applicationPath: content.application_path
            });
            applicationPath.value = content.application_path;
        }

        livewireRequests.value.push(content);
        dispatch(content);
    });

    window.ipcRenderer.on("jobs", (event, { content }) => {
        if (pausePayloadStore.is_paused) {
            return;
        }

        if (applicationPath.value != content.application_path) {
            window.ipcRenderer.send("storage.check", {
                applicationPath: content.application_path
            });
            applicationPath.value = content.application_path;
        }

        jobStore.addOrUpdateJob(content.jobs, content.ide_handle);

        const serializableJobs = deepClone(jobStore.jobs);

        if (content.to_screen.new_window) {
            screenStore.hidden(content.to_screen.screen_name);

            window.ipcRenderer.send("screen-window:show", {
                screen: content.to_screen.screen_name,
                payload: {},
                jobs: serializableJobs,
                position: {}
            });
        }

        if (content.to_screen && !content.to_screen.new_window) {
            window.ipcRenderer.send("send-screen-window-update", {
                screen: content.to_screen.screen_name,
                payload: {},
                jobs: serializableJobs
            });
        }
    });

    window.ipcRenderer.on("html", (event, { content }) => dispatch(content));
    window.ipcRenderer.on("mailable", (event, { content }) => dispatch(content));
    window.ipcRenderer.on("table_v2", (event, { content }) => dispatch(content));
    window.ipcRenderer.on("table", (event, { content }) => dispatch(content));
    window.ipcRenderer.on("http-client", (event, { content }) => dispatch(content));
    window.ipcRenderer.on("model", (event, { content }) => dispatch(content));
    window.ipcRenderer.on("json", (event, { content }) => dispatch(content));
    window.ipcRenderer.on("query", (event, { content }) => dispatch(content));

    window.ipcRenderer.on("mail", (event, { content }) => {
        if (pausePayloadStore.is_paused) {
            return;
        }

        if (applicationPath.value != content.application_path) {
            window.ipcRenderer.send("storage.check", {
                applicationPath: content.application_path
            });
            applicationPath.value = content.application_path;
        }

        mailStore.addOrUpdateMail(content.mail, content.ide_handle, content.context);
    });

    window.ipcRenderer.on("label", (event, { content }) => {
        if (pausePayloadStore.is_paused) {
            return;
        }

        payloadStore.updateLabelPayload(content);
    });

    window.ipcRenderer.on("context", (event, { content }) => {
        if (pausePayloadStore.is_paused) {
            return;
        }

        payloadStore.updatePayload(content, "context");
    });

    window.ipcRenderer.on("log_application", (event, { content }) => {
        if (pausePayloadStore.is_paused) {
            return;
        }

        if (applicationPath.value != content.application_path) {
            window.ipcRenderer.send("storage.check", {
                applicationPath: content.application_path
            });
            applicationPath.value = content.application_path;
        }

        logStore.add(content);

        const serializable = deepClone(logStore.logs);

        if (content.to_screen.new_window) {
            screenStore.hidden(content.to_screen.screen_name);

            window.ipcRenderer.send("screen-window:show", {
                screen: content.to_screen.screen_name,
                logs: serializable
            });
        }

        if (content.to_screen && !content.to_screen.new_window) {
            window.ipcRenderer.send("send-screen-window-update", {
                screen: content.to_screen.screen_name,
                logs: serializable
            });
        }
    });

    window.ipcRenderer.on("color", async (event, { content }) => {
        if (pausePayloadStore.is_paused) {
            return;
        }

        payloadStore.updateColorPayload(content);
    });

    window.ipcRenderer.on("screen", (event, { content }) => {
        if (pausePayloadStore.is_paused) {
            return;
        }

        payloadStore.updateScreenPayload(content);
        const screen: ScreenPayload = content.to_screen;
        addScreen(screen);

        if (screenStore.get(screen.screen_name)?.pinned) {
            toggleScreen(screen.screen_name, true);
        }

        // raise_in: seconds
        if (screen.raise_in > 0) {
            setTimeout(() => {
                toggleScreen(screen.screen_name, true);
            }, screen.raise_in * 1000);
        }
    });

    window.ipcRenderer.on("json_validate", (event, { content }) => {
        if (pausePayloadStore.is_paused) {
            return;
        }

        payloadStore.updateJSONValidatePayload(content);
    });

    window.ipcRenderer.on("validate", (event, { content }) => {
        if (pausePayloadStore.is_paused) {
            return;
        }

        payloadStore.updateValidatePayload(content);
    });

    let lastPayloadTimeout: NodeJS.Timeout | null = null;
    let lastPayloadReceivedTime = 0;

    window.ipcRenderer.on("dump.batches", (event, args) => {
        if (pauseQueries.is_paused) {
            return;
        }

        if (args.type === "batch") {
            lastPayloadReceivedTime = Date.now();

            if (lastPayloadTimeout) {
                clearTimeout(lastPayloadTimeout);
                lastPayloadTimeout = null;
            }

            args.contents.forEach(({ content }) => {
                const requestId = content.request_id;
                const sqlQuery = content.queries.sql;

                pendingRequestsStore.add(requestId, "queries", sqlQuery);

                const storedQuery = pendingRequestsStore.get(requestId, "queries");

                if (blockedStore.blocked.includes(storedQuery)) {
                    console.log(`all sql queries are blocked for request id ${requestId}`);
                    return;
                }

                content.queries && timeStore.increment(content.request_id, content.id, content.queries);

                if (applicationPath.value != content.application_path) {
                    window.ipcRenderer.send("storage.check", {
                        applicationPath: content.application_path
                    });
                    applicationPath.value = content.application_path;
                }

                queriesStore.add(content);

                addScreen(content.to_screen);
            });

            lastPayloadTimeout = setTimeout(() => {
                if (Date.now() - lastPayloadReceivedTime >= 200) {
                    const lastPayload: Payload = queriesStore.payload[queriesStore.payload.length - 1];
                    if (lastPayload) {
                        timeStore.selected = lastPayload.request_id;
                    }
                }
            }, 200);
        }
    });

    window.ipcRenderer.on("time_track", (event, { content }) => {
        if (pausePayloadStore.is_paused) {
            return;
        }

        const exist = payloadStore.payload.filter((globalPayload: Payload) => globalPayload.with_label.label === content.with_label.label);

        if (exist.length === 0) {
            dispatch(content);

            return;
        }

        payloadStore.updateTimeTrackPayload(content);
    });
};

const dumpsBagFiltered = computed((): Payload[] => {
    return payloadStore.filteredPayload
        .filter(
            (dump: Payload) =>
                JSON.stringify(dump[dump.type] ?? "")
                    .toLowerCase()
                    .includes(globalSearchStore.search.toLowerCase()) || JSON.stringify(dump.with_label)?.toLowerCase().includes(globalSearchStore.search.toLowerCase())
        )
        .filter((dump: Payload) => {
            if (colorStore.colors.length > 0 && dump.color) {
                return colorStore.colors.includes(dump.color);
            }
            return true;
        });
});

const addScreen = (param: ScreenPayload) => {
    param.visible = true;
    param.pinned = false;
    screenStore.add(param);
};

const maximizeApp = (autoInvokeApp: string | boolean): void => {
    autoInvokeApp && window.ipcRenderer.send("main:show");
};

const toggleScreen = async (value: string, shouldActivate = false): Promise<void> => {
    if (screenStore.get(value) && !screenStore.get(value).visible) {
        return;
    }

    if (shouldActivate) {
        screenStore.activeScreen(value);
        await nextTick();
    }

    if (screenStore.screen === value) {
        payloadStore.filteredPayload = payloadStore.payload.filter((payload) => payload.type !== "screen" && payload.to_screen.screen_name === value);
    }

    await nextTick(() => {
        if (!["jobs", "mail", "logs", "queries"].includes(screenStore.screen)) {
            document.getElementById(settingsStore.settings.scroll_direction)?.scrollIntoView({ behavior: "smooth" });
        }
    });
};

const dispatch = (content: any): void => {
    if (pausePayloadStore.is_paused) {
        return;
    }

    content.rendered = false;

    if (applicationPath.value != content.application_path) {
        window.ipcRenderer.send("storage.check", {
            applicationPath: content.application_path
        });
        applicationPath.value = content.application_path;
    }

    if (!content.hasOwnProperty("to_screen")) {
        alert("An error occurred, please update the app and laradumps-core and try again.");
        window.location.reload();
    }

    if (content.to_screen && typeof content.to_screen.screen_name == "string") {
        addScreen(content.to_screen);
    }

    if (payloadStore.payload.length >= settingsStore.settings.limit_dumps) {
        payloadStore.payload.shift();
    }

    if (settingsStore.settings.show_badge_count) {
        content.show_badge_count = true;
    }

    content.projectInfo = currentProjectStore.projectInfo;

    payloadStore.add(content);

    maximizeApp(content.auto_invoke_app);

    const serializablePayload = deepClone(payloadStore.payload.filter((payload: Payload) => payload.to_screen?.screen_name === content.to_screen.screen_name));

    if (content.to_screen.new_window) {
        screenStore.hidden(content.to_screen.screen_name);

        window.ipcRenderer.send("screen-window:show", {
            screen: content.to_screen.screen_name,
            payload: serializablePayload,
            position: {}
        });
    } else {
        window.ipcRenderer.send("send-screen-window-update", {
            screen: content.to_screen.screen_name,
            payload: serializablePayload
        });
    }

    if (screenStore.get(content.to_screen.screen_name)?.pinned) {
        nextTick(() => toggleScreen(content.to_screen.screen_name, true));
    } else {
        setTimeout(() => toggleScreen(content.to_screen.screen_name, false), 10);
    }
};

const openScreenWindow = () => {
    screenStore.toggleVisible(screenStore.screen);

    const serializablePayload = deepClone(payloadStore.get(screenStore.screen));
    const serializableJobPayload = deepClone(jobStore.jobs);
    const serializableMailPayload = deepClone(mailStore.mails);
    const serializableLogPayload = deepClone(logStore.logs);
    const serializableQueriesPayload = deepClone(queriesStore.payload);

    window.ipcRenderer.send("screen-window:show", {
        screen: screenStore.screen,
        payload: serializablePayload,
        jobs: serializableJobPayload,
        mails: serializableMailPayload,
        logs: serializableLogPayload,
        queries: serializableQueriesPayload,
        position: {}
    });

    setTimeout(() => {
        const screenName = screenStore.screen === "home" ? screenStore.getNext("home").screen_name : "home";
        toggleScreen(screenName);
    }, 200);
};
</script>
<template>
    <div
        :class="{ absolute: !inScreenWindow }"
        class="flex overflow-hidden flex-col flex-1 right-0 left-0 h-fill-available"
    >
        <div
            v-if="inScreenWindow"
            class="mt-3 h-[calc(100vh-50px)] w-[100vw] text-base"
        >
            <ScreenWindow
                v-if="!['jobs', 'mail', 'logs', 'queries'].includes(inScreenWindow)"
                v-model:dumps="payloadScreen"
                v-model:screen="inScreenWindow"
            />

            <JobView
                :in-screen-window="inScreenWindow.length > 0"
                v-if="inScreenWindow === 'jobs'"
                :items="jobScreen"
            />

            <MailView
                :in-screen-window="inScreenWindow.length > 0"
                v-if="inScreenWindow === 'mail'"
                :items="mailScreen"
            />

            <LogView
                :in-screen-window="inScreenWindow.length > 0"
                v-if="inScreenWindow === 'logs'"
                :items="logScreen"
            />
        </div>

        <div v-else>
            <XDebugMode v-if="xdebugMode && xDebugStore.current && xDebugStore.current.project_path" />

            <div v-else>
                <TheAppUpdateInfo />

                <!-- content -->
                <div class="flex flex-col flex-1 absolute inset-0 overflow-hidden">
                    <main class="flex flex-col flex-1 min-h-full space-y-1">
                        <!-- screen buttons -->
                        <div class="flex">
                            <div class="flex mt-1 px-1 items-center justify-between w-full overflow-x-auto">
                                <Screens @toggleScreen="toggleScreen" />

                                <button
                                    v-if="!['home', 'livewire', 'queries'].includes(screenStore.screen)"
                                    @click="openScreenWindow"
                                    class="btn btn-xs btn-ghost"
                                >
                                    <IconExternalLink class="w-4 opacity-90" />
                                </button>
                            </div>
                        </div>

                        <div v-if="screenStore.screen === 'jobs'">
                            <JobView class="h-[calc(100vh-91px)] w-[100vw] text-base" />
                        </div>

                        <div v-if="screenStore.screen === 'mail'">
                            <MailView class="h-[calc(100vh-85px)] w-[100vw] text-base" />
                        </div>

                        <div v-if="screenStore.screen === 'logs'">
                            <LogView class="h-[calc(100vh-100px)] w-[100vw] text-base" />
                        </div>

                        <div v-if="screenStore.screen === 'queries'">
                            <QueriesView class="w-[100vw] text-base" />
                        </div>

                        <div
                            v-else
                            :class="{
                                'items-center': payloadStore.payload.length === 0
                            }"
                            class="flex flex-col rounded-sm text-base h-[calc(100vh-85px)] w-[100vw] overflow-auto"
                        >
                            <div id="top"></div>

                            <div
                                :class="{
                                    'w-full': dumpsBagFiltered.length === 0 && screenStore.screen !== 'home'
                                }"
                            >
                                <div
                                    id="dumps-base"
                                    class="w-full mb-[40px]"
                                    v-if="payloadStore.payload.length > 0"
                                    :class="{
                                        'flex flex-col-reverse': settingsStore.settings.dump_order === 'normal'
                                    }"
                                >
                                    <div
                                        v-for="(payload, index) in dumpsBagFiltered"
                                        :key="payload.sf_dump_id"
                                        :id="payload.id"
                                        class="w-full"
                                    >
                                        <DumpItem
                                            class="w-full px-2 group text-sm mb-2"
                                            v-show="screenStore.screen !== 'livewire'"
                                            :payload="payload"
                                        />
                                    </div>

                                    <DumpLivewire
                                        v-if="screenStore.screen === 'livewire'"
                                        class="pt-2"
                                        v-model:livewire-requests="livewireRequests"
                                    />
                                </div>

                                <div
                                    v-if="dumpsBagFiltered.length === 0 && !['jobs', 'mail', 'logs', 'queries', 'home'].includes(screenStore.screen)"
                                    class="-ml-8 -mt-14 absolute flex items-center justify-center w-full"
                                    style="height: -webkit-fill-available"
                                >
                                    <SvgEmpty class="w-30 opacity-25" />
                                    <div class="text-base-content/70">
                                        <h1 class="text-lg font-semibold mb-2">No {{ screenStore.screen }}</h1>
                                    </div>
                                </div>
                            </div>

                            <div id="bottom"></div>

                            <WelcomePage
                                v-if="payloadStore.payload.length === 0 && screenStore.screen === 'home'"
                                class="w-full h-full"
                            />
                        </div>
                    </main>
                </div>
            </div>
        </div>
    </div>
</template>
