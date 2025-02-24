<script lang="ts" setup>
import { computed, markRaw, nextTick, onBeforeMount, onMounted, ref } from "vue";
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
import HeaderQueryRequests from "@/components/HeaderQueryRequests.vue";
import { useIDEHandlerStore } from "@/store/ide-handler";
import DumpScreens from "@/components/DumpScreens.vue";
import TheAppUpdateInfo from "@/components/TheAppUpdateInfo.vue";
import DumpLivewire from "@/components/DumpLivewire.vue";
import ScreenWindow from "@/components/ScreenWindow.vue";
import { usePayloadStore } from "@/store/payload";
import { useQueryDuplicated } from "@/store/query-duplicated";
import { useSettingsStore } from "@/store/settings";
import XDebugMode from "@/components/XDebugMode.vue";
import { useXDebug } from "@/store/xdebug";
import JobMonitor from "@/components/JobMonitor.vue";
import { useJobStore } from "@/store/jobs";
import { useMailStore } from "@/store/mail";
import MailView from "@/components/MailView.vue";

markRaw(TheUpdateModalInfo);

const xDebugStore = useXDebug();
const screenStore = useScreenStore();
const timeStore = useTimeStore();
const colorStore = useColorStore();
const globalSearchStore = useGlobalSearchStore();
const IDEHandler = useIDEHandlerStore();
const payloadStore = usePayloadStore();
const settingsStore = useSettingsStore();

const { locale } = useI18n({ useScope: "global" });
const localeStore = useI18nStore();
const jobStore = useJobStore();
const mailStore = useMailStore();

const defaultScreen = ref({
    screen_name: "home",
    raise_in: 0,
    visible: true,
    pinned: false,
    new_window: false
});

const appVersion = ref("");

const payload = ref([]);
const dumpsBag = ref([]);
const inScreenWindow = ref("");
const payloadScreen = ref([]);
const jobScreen = ref({});
const mailScreen = ref([]);

const applicationPath = ref("");
const livewireRequests = ref([]);
const isPaused = ref(false);

const allRequests = ref([]);
const xdebugMode = ref(false);

onBeforeMount(() => {
    locale.value = localeStore.value;
});

onMounted(() => {
    xdebugMode.value = typeof xDebugStore.current.project_path !== "undefined";
    IDEHandler.setValue(localStorage.IDEHandler);

    setTimeout(() => (document.title = "LaraDumps - " + appVersion.value), 200);
    addScreen(defaultScreen.value);

    window.ipcRenderer.on("app:pause-dumps", (event, arg) => (isPaused.value = arg));

    window.ipcRenderer.on("dump", (event, { content }) => dispatch("dump", event, content));

    window.ipcRenderer.send("main:app-version");
    window.ipcRenderer.on("main:app-version.reply", (event, arg) => setTimeout(() => (appVersion.value = `v${arg.version}`), 100));

    window.ipcRenderer.on("app:screen-window-enable", async (event, args) => {
        inScreenWindow.value = args.screen;
        payloadScreen.value = args.payload;
        jobScreen.value = args.jobs;
        mailScreen.value = args.mails;

        setTimeout(() => (document.title = "LaraDumps - " + args.screen), 200);
    });

    window.ipcRenderer.on("app:screen-window-update", async (event, args) => {
        payloadScreen.value = args.payload;
        jobScreen.value = args.jobs;
    });

    window.ipcRenderer.send("local-shortcut:get");

    window.ipcRenderer.on("xdebug-connected", (event, arg) => {
        xdebugMode.value = true;
    });

    window.ipcRenderer.on("xdebug-disconnected", (event, arg) => {
        xDebugStore.current.project_path = "";
        xdebugMode.value = false;
    });

    window.ipcRenderer.on("xdebug", (event, { content }) => dispatch("xdebug", event, content));

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
        livewireRequests.value.push(content);
        dispatch("livewire", event, content);
    });

    window.ipcRenderer.on("jobs", (event, { content }) => {
        // Clear the oldest job if the limit is reached
        if (Object.keys(jobStore.jobs).length == settingsStore.settings.limit_dumps + 1) {
            const oldestJobKey = Object.keys(jobStore.jobs).reduce((oldestKey, currentKey) => {
                return jobStore.jobs[currentKey].pushed_time < jobStore.jobs[oldestKey].pushed_time ? currentKey : oldestKey;
            }, Object.keys(jobStore.jobs)[0]);
            delete jobStore.jobs[oldestJobKey];
        }

        jobStore.addOrUpdateJob(content.jobs, content.ide_handle);

        const serializableJobs = JSON.parse(JSON.stringify(jobStore.jobs));

        if (content.to_screen.new_window) {
            screenStore.hidden(content.to_screen.screen_name);

            window.ipcRenderer.send("screen-window:show", {
                screen: content.to_screen.screen_name,
                payload: {},
                jobs: serializableJobs,
                position: {}
            });
        } else {
            window.ipcRenderer.send("send-screen-window-update", {
                screen: content.to_screen.screen_name,
                payload: {},
                jobs: serializableJobs
            });
        }
    });

    window.ipcRenderer.on("html", (event, { content }) => dispatch("html", event, content));
    window.ipcRenderer.on("mailable", (event, { content }) => dispatch("mailable", event, content));
    window.ipcRenderer.on("table_v2", (event, { content }) => dispatch("table_v2", event, content));
    window.ipcRenderer.on("mail", (event, { content }) => {
        mailStore.addOrUpdateMail(content.mail, content.ide_handle);
    });

    window.ipcRenderer.on("label", (event, { content }) => {
        payloadStore.updateLabelPayload(content);
    });
    window.ipcRenderer.on("table", (event, { content }) => dispatch("table", event, content));
    window.ipcRenderer.on("http-client", (event, { content }) => dispatch("http-client", event, content));
    window.ipcRenderer.on("model", (event, { content }) => dispatch("model", event, content));
    window.ipcRenderer.on("log_application", (event, { content }) => {
        dispatch("log_application", event, content);
        payloadStore.updateLogPayload(content);
    });
    window.ipcRenderer.on("color", (event, { content }) => {
        payloadStore.updateColorPayload(content);
    });
    window.ipcRenderer.on("screen", (event, { content }) => {
        payloadStore.updateScreenPayload(content);
        const screen: ScreenPayload = content.to_screen;
        addScreen(screen);

        if (screenStore.get(screen.screen_name)?.pinned) {
            toggleScreen(screen.screen_name, true);
        }
    });
    window.ipcRenderer.on("json_validate", (event, { content }) => {
        payloadStore.updateJSONValidatePayload(content);
    });
    window.ipcRenderer.on("validate", (event, { content }) => {
        payloadStore.updateValidatePayload(content);
    });
    window.ipcRenderer.on("json", (event, { content }) => dispatch("json", event, content));
    window.ipcRenderer.on("queries", (event, { content }) => dispatch("queries", event, content));
    window.ipcRenderer.on("query", (event, { content }) => dispatch("query", event, content));
    window.ipcRenderer.on("time_track", (event, { content }) => {
        const exist = payloadStore.payload.filter((globalPayload: Payload) => globalPayload.with_label.label === content.with_label.label);

        if (exist.length === 0) {
            dispatch("time-track", event, content);

            return;
        }

        payloadStore.updateTimeTrackPayload(content);
    });
};

const dumpsBagFiltered = computed(() => {
    const reverseTimeOrder = (reversed) => {
        return function () {
            reversed = !reversed;
            return function (a, b) {
                const aTime = a?.queries?.time;
                const bTime = b?.queries?.time;
                return (aTime === bTime ? 0 : aTime < bTime ? -1 : 1) * (reversed ? -1 : 1);
            };
        };
    };

    const sort = reverseTimeOrder(timeStore.order);
    const queryDuplicatedStore = useQueryDuplicated();

    const dumps = dumpsBag.value;

    dumps
        .filter((dump: Payload) => dump.type === "queries")
        .forEach((dump: Payload) => {
            const sql = dump.queries.sql;

            const isDuplicate = dumps.filter((d: Payload) => d.type === "queries" && d.request_id === dump.request_id && d.queries.sql === sql);

            queryDuplicatedStore.add(dump.request_id, sql, isDuplicate.length > 1, isDuplicate.length);
        });

    return dumps
        .filter(
            (dump: Payload) =>
                JSON.stringify(dump[dump.type] ?? "")
                    .toLowerCase()
                    .includes(globalSearchStore.search.toLowerCase()) || dump.label?.toLowerCase().includes(globalSearchStore.search.toLowerCase())
        )
        .filter((dump) => {
            if (colorStore.colors.length > 0) {
                return colorStore.colors.includes(dump.color);
            }
            return true;
        })
        .map((dump: Payload) => {
            if (dump.type === "queries") {
                const { time, uri, method } = dump.queries;
                timeStore.increment(dump.request_id, dump.id, time, uri, method);
            }
            return dump;
        })
        .sort(sort());
});

const addScreen = (param) => {
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
        dumpsBag.value = payloadStore.payload.filter((payload) => payload.type !== "screen" && payload.to_screen.screen_name === value);
    }

    await nextTick(() => {
        if (!["jobs", "mail"].includes(screenStore.screen)) {
            document.getElementById(settingsStore.settings.scroll_direction)?.scrollIntoView({ behavior: "smooth" });
        }
    });

    if (screenStore.screen === "queries") {
        setTimeout(() => {
            const lastPayload: Payload = dumpsBag.value[dumpsBag.value.length - 1];
            if (lastPayload) timeStore.selected = lastPayload.request_id;
        }, 50);
    }
};

type EventType = "label" | "color" | "screen" | "dump";

const dispatch = (type: string, event: EventType, content: any): void => {
    if (isPaused.value) {
        return;
    }

    content.rendered = false;

    if (typeof content.date_time == "undefined") {
        content.date_time = new Date();
    }

    if (applicationPath.value != content.application_path) {
        window.ipcRenderer.send("storage.check", {
            applicationPath: content.application_path
        });
        applicationPath.value = content.application_path;
    }

    if (typeof content.to_screen.screen_name == "string") {
        addScreen(content.to_screen);
    }

    if (payloadStore.payload.length >= settingsStore.settings.limit_dumps) {
        payloadStore.payload.shift();
    }

    payloadStore.add(content);

    let screenName = content.to_screen.screen_name ?? "home";

    if (!["logs", "queries"].includes(screenName)) {
        maximizeApp(content.auto_invoke_app);
    }

    const serializablePayload = JSON.parse(JSON.stringify(payload.value.filter((payload: Payload) => payload.to_screen?.screen_name === content.to_screen.screen_name)));

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
</script>
<template>
    <div
        :class="{ absolute: !inScreenWindow }"
        class="flex overflow-hidden flex-col flex-1 right-0 left-0 h-fill-available"
    >
        <div v-if="inScreenWindow">
            <ScreenWindow
                v-if="inScreenWindow !== 'jobs'"
                :dumps-items="payloadScreen"
                v-model:screen="inScreenWindow"
            />

            <JobMonitor
                v-if="inScreenWindow === 'jobs'"
                :items="jobScreen"
                class="mt-3 h-[calc(100vh-85px)] w-[100vw] text-base overflow-auto"
            />

            <MailView
                v-if="inScreenWindow === 'mail'"
                :items="mailScreen"
                class="mt-3 h-[calc(100vh-85px)] w-[100vw] text-base overflow-auto"
            />
        </div>

        <div
            v-else
            :data-theme="settingsStore.settings.theme"
        >
            <XDebugMode v-if="xdebugMode && xDebugStore.current.project_path" />

            <div v-else>
                <TheAppUpdateInfo />

                <!-- content -->
                <div class="flex flex-col flex-1 absolute inset-0 overflow-hidden">
                    <main class="flex flex-col flex-1 min-h-full">
                        <!-- screen buttons -->
                        <div class="flex px-2">
                            <div class="flex items-center justify-between w-full overflow-x-auto">
                                <DumpScreens @toggleScreen="toggleScreen" />
                            </div>
                        </div>

                        <div v-if="screenStore.screen === 'jobs'">
                            <JobMonitor class="h-[calc(100vh-85px)] w-[100vw] text-base overflow-auto" />
                        </div>

                        <div v-if="screenStore.screen === 'mail'">
                            <MailView class="h-[calc(100vh-85px)] w-[100vw] text-base" />
                        </div>

                        <div
                            v-else
                            :class="{
                                'px-3 items-center': payloadStore.payload.length === 0,
                                flex: dumpsBagFiltered.length === 0
                            }"
                            class="rounded-sm text-base overflow-auto h-[calc(100vh-85px)] w-[100vw]"
                        >
                            <div id="top"></div>

                            <div v-if="screenStore.screen === 'queries'">
                                <HeaderQueryRequests
                                    :in-screen-window="inScreenWindow ? 'true' : 'false'"
                                    :all-requests="allRequests"
                                    :total="dumpsBagFiltered.length"
                                    :total-filtered="dumpsBagFiltered.filter((payload: Payload) => payload.request_id === timeStore.selected).length"
                                />
                            </div>

                            <div
                                :class="{
                                    flex: screenStore.screen === 'queries',
                                    'w-full': dumpsBagFiltered.length === 0 && screenStore.screen !== 'home'
                                }"
                            >
                                <div
                                    id="dumps-base"
                                    class="w-full mb-[40px]"
                                    v-if="payloadStore.payload.length > 0"
                                    :class="{ 'flex flex-col-reverse': settingsStore.settings.dump_order === 'normal' && screenStore.screen !== 'queries' }"
                                >
                                    <div
                                        v-for="(payload, index) in dumpsBagFiltered"
                                        :key="payload.sf_dump_id"
                                        :id="payload.id"
                                        class="w-full"
                                    >
                                        <DumpItem
                                            :class="{
                                                'pl-3': screenStore.screen === 'queries',
                                                'px-3': screenStore.screen !== 'queries'
                                            }"
                                            class="w-full group text-sm mb-2"
                                            v-show="screenStore.screen === 'queries' ? payload.request_id === timeStore.selected : screenStore.screen !== 'livewire'"
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
                                    class="flex items-center justify-center w-full h-full"
                                    style="height: -webkit-fill-available"
                                    v-if="dumpsBagFiltered.length === 0 && screenStore.screen !== 'home'"
                                >
                                    <span class="text-sm uppercase">No {{ screenStore.screen }}</span>
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
