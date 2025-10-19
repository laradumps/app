<script lang="ts" setup>
import { computed, nextTick, onBeforeMount, onBeforeUnmount, onMounted, ref } from "vue";
import { useScreenStore } from "@/store/screen";
import { useI18nStore } from "@/store/i18n";
import { useTimeStore } from "@/store/time";
import { useGlobalSearchStore } from "@/store/global-search";
import { useI18n } from "vue-i18n";
import { useColorStore } from "@/store/colors";
import { Payload, ScreenPayload } from "@/types/Payload";
import DumpItem from "@/components/dumps/DumpItem.vue";
import WelcomePage from "@/components/app/WelcomePage.vue";
import Screens from "@/components/screen/Screens.vue";
import TheAppUpdateInfo from "@/components/app/TheAppUpdateInfo.vue";
import DumpLivewire from "@/components/laravel/DumpLivewire.vue";
import ScreenWindow from "@/components/screen/ScreenWindow.vue";
import { usePayloadStore } from "@/store/payload";
import { useSettingsStore } from "@/store/settings";
import XDebugMode from "@/components/xdebug/XDebugMode.vue";
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
import { useSavedDumpsStore } from "@/store/saved-dumps";
import { usePausePayloadStore } from "@/store/pause";
import { useQueriesBlockedStore } from "@/store/queries-blocked";
import { usePendingRequestsStore } from "@/store/pending-requests";
import { usePauseQueriesStore } from "@/store/pause-queries";
import { useCurrentProject } from "@/store/current-project";
import SvgEmpty from "@/components/svg/SvgEmpty.vue";
import { useLivewireStore } from "@/store/livewire";
import { Environment } from "../../main/storage";
import { usePauseJobsStore } from "@/store/pause-jobs";
import { usePauseLogsStore } from "@/store/pause-logs";
import moment from "moment/moment";
import HeaderColorsFilter from "@/components/app/HeaderColorsFilter.vue";
import DropZones from "@/components/split/DropZones.vue";
import SplitPanes from "@/components/split/SplitPanes.vue";
import { useSplitPanesStore } from "@/store/split-panes";

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
const pauseLogsStore = usePauseLogsStore();
const livewireStore = useLivewireStore();
const splitPanesStore = useSplitPanesStore();

const { locale } = useI18n({ useScope: "global" });
const localeStore = useI18nStore();
const jobStore = useJobStore();
const mailStore = useMailStore();
const pendingRequestsStore = usePendingRequestsStore();
const blockedStore = useQueriesBlockedStore();
const pauseQueries = usePauseQueriesStore();
const currentProjectStore = useCurrentProject();
const pauseJobsStore = usePauseJobsStore();

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

const xdebugMode = ref(false);
const isDraggingScreen = ref(false);
const draggedScreenName = ref("");

onBeforeMount(() => {
    locale.value = localeStore.value;
});

onBeforeUnmount(() => {
    const events = [
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
    ];

    events.forEach((event) => {
        window.ipcRenderer.removeAllListeners(event);
    });
});

onMounted(() => {
    if (xDebugStore.current) {
        xdebugMode.value = typeof xDebugStore.current.project_path !== "undefined";
    }

    addScreen(defaultScreen.value);

    window.ipcRenderer.on("dump", (_, { content }) => {
        dispatch(content);
    });

    window.ipcRenderer.send("main:app-version");

    window.ipcRenderer.on("main:app-version.reply", (_, arg) => {
        document.title = "LaraDumps - " + `v${arg.version}`;
    });

    window.ipcRenderer.on("app:screen-window-enable", async (_, args) => {
        inScreenWindow.value = args.screen;
        payloadScreen.value = args.payload;
        jobScreen.value = args.jobs;
        mailScreen.value = args.mails;
        logScreen.value = args.logs;
        queriesScreen.value = args.queries;

        setTimeout(() => (document.title = "LaraDumps - " + args.screen), 200);
    });

    window.ipcRenderer.on("app:screen-window-update", async (_, args) => {
        payloadScreen.value = args.payload;
        jobScreen.value = args.jobs;
        mailScreen.value = args.mails;
        logScreen.value = args.logs;
        queriesScreen.value = args.queries;
    });

    window.ipcRenderer.send("local-shortcut:get");

    window.ipcRenderer.on("xdebug-connected", (_, arg) => {
        xdebugMode.value = true;
    });

    window.ipcRenderer.on("xdebug-disconnected", (_, arg) => {
        if (xDebugStore.current) {
            xDebugStore.current.project_path = "";
        }
        xdebugMode.value = false;
    });

    window.ipcRenderer.on("xdebug", (_, { content }) => dispatch(content));

    dumpListeners();

    window.ipcRenderer.send("storage.get");

    toggleScreen("home");

    window.addEventListener("add-screen", (event: Event) => {
        const detail: Environment = (event as CustomEvent).detail;

        const screenName = detail.value.replace("_", " ");

        if (detail.selected) {
            addScreen({
                screen_name: screenName,
                raise_in: 0,
                visible: true,
                pinned: false,
                new_window: false
            });
        } else {
            screenStore.remove(screenName);
        }
    });

    const savedStore = useSavedDumpsStore();

    window.ipcRenderer.on("saved-dumps:remove", (_event, args) => {
        const { id } = args || {};
        if (!id) return;

        if (pausePayloadStore.is_paused) {
            return;
        }

        savedStore.remove(id);

        const updated = deepClone(savedStore.all);

        window.ipcRenderer.send("send-screen-window-update", {
            screen: "saved",
            payload: updated
        });
    });
});

const dumpListeners = () => {
    window.ipcRenderer.on("livewire", (_, { content }) => {
        if (pausePayloadStore.is_paused) {
            return;
        }

        if (content.application_path && applicationPath.value != content.application_path) {
            window.ipcRenderer.send("storage.check", {
                applicationPath: content.application_path
            });
            applicationPath.value = content.application_path;
        }

        livewireStore.add(content.livewire);
        dispatch(content);
    });

    window.ipcRenderer.on("jobs", (event, { content }) => {
        if (pauseJobsStore.is_paused) {
            return;
        }

        if (content.application_path && applicationPath.value != content.application_path) {
            window.ipcRenderer.send("storage.check", {
                applicationPath: content.application_path
            });
            applicationPath.value = content.application_path;
        }

        jobStore.addOrUpdateJob(content);

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

    window.ipcRenderer.on("html", (event, { content }) => {
        if (pausePayloadStore.is_paused) {
            return;
        }
        dispatch(content);
    });

    window.ipcRenderer.on("mailable", (event, { content }) => {
        if (pausePayloadStore.is_paused) {
            return;
        }
        dispatch(content);
    });

    window.ipcRenderer.on("table_v2", (event, { content }) => {
        if (pausePayloadStore.is_paused) {
            return;
        }
        dispatch(content);
    });

    window.ipcRenderer.on("table", (event, { content }) => {
        if (pausePayloadStore.is_paused) {
            return;
        }
        dispatch(content);
    });

    window.ipcRenderer.on("http-client", (event, { content }) => {
        if (pausePayloadStore.is_paused) {
            return;
        }
        dispatch(content);
    });

    window.ipcRenderer.on("model", (event, { content }) => {
        if (pausePayloadStore.is_paused) {
            return;
        }
        dispatch(content);
    });

    window.ipcRenderer.on("json", (event, { content }) => {
        if (pausePayloadStore.is_paused) {
            return;
        }
        dispatch(content);
    });

    window.ipcRenderer.on("query", (event, { content }) => {
        if (pausePayloadStore.is_paused) {
            return;
        }
        dispatch(content);
    });

    window.ipcRenderer.on("mail", (event, { content }) => {
        if (pausePayloadStore.is_paused) {
            return;
        }

        if (content.application_path && applicationPath.value != content.application_path) {
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
        if (pausePayloadStore.is_paused || pauseLogsStore.is_paused) {
            return;
        }

        if (content.application_path && applicationPath.value != content.application_path) {
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
                payload: {},
                logs: serializable,
                position: {}
            });
        }

        if (content.to_screen && !content.to_screen.new_window) {
            window.ipcRenderer.send("send-screen-window-update", {
                screen: content.to_screen.screen_name,
                payload: {},
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
                const sqlQuery = content.queries.query?.sql;

                pendingRequestsStore.add(requestId, "queries", sqlQuery);

                const storedQuery = pendingRequestsStore.get(requestId, "queries");

                if (blockedStore.blocked.includes(storedQuery)) {
                    console.log(`all sql queries are blocked for request id ${requestId}`);
                    return;
                }

                content.queries && timeStore.increment(content.request_id, content.id, content.queries);

                if (content.application_path && applicationPath.value != content.application_path) {
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
                dump.content?.toLowerCase().includes(globalSearchStore.search.toLowerCase()) || JSON.stringify(dump.with_label)?.toLowerCase().includes(globalSearchStore.search.toLowerCase())
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

    if (content.application_path && applicationPath.value != content.application_path) {
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

    content.color = content.color || "gray";
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

    if (splitPanesStore.splitConfig?.active) {
        const paneAScreen = screenStore.screen;
        const targetScreen = content.to_screen.screen_name;

        nextTick(() => {
            toggleScreen(targetScreen, false);
            setTimeout(() => toggleScreen(paneAScreen, true), 300)
        });

        return;
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

const groupedDumps = computed(() => {
    return dumpsBagFiltered.value.reduce(
        (groups, payload) => {
            const groupKey = moment(payload.date_time).format("YYYY-MM-DD HH:mm:ss");
            if (!groups[groupKey]) {
                groups[groupKey] = [];
            }
            groups[groupKey].push(payload);
            return groups;
        },
        {} as Record<string, Payload[]>
    );
});

const hasColorsInPayload = computed((): boolean => {
    return payloadStore.payload.some((payload: Payload) => payload.color && payload.color !== "gray");
});

const deleteDump = (id: string): void => {
    payloadStore.removePayload(id);
};

const handleDragScreen = ({ screen, event }) => {
    draggedScreenName.value = screen;
    isDraggingScreen.value = true;
};

const handleDropZone = (zone: "right" | "bottom") => {
    if (!draggedScreenName.value) {
        return;
    }

    const orientation = zone === "right" ? "vertical" : "horizontal";

    splitPanesStore.setSplit(draggedScreenName.value, orientation);

    if (screenStore.screen === draggedScreenName.value) {
        const nextScreen = screenStore.getNext(draggedScreenName.value);
        if (nextScreen) {
            toggleScreen(nextScreen.screen_name, true);
        }
    }

    isDraggingScreen.value = false;
    draggedScreenName.value = "";
};

const handleCloseSplit = () => {
    splitPanesStore.clearSplit();
};

const handleDragEnd = () => {
    setTimeout(() => {
        if (isDraggingScreen.value) {
            isDraggingScreen.value = false;
            draggedScreenName.value = "";
        }
    }, 100);
};
</script>
<template>
    <div
        :class="{ absolute: !inScreenWindow }"
        class="flex overflow-hidden flex-col flex-1 right-0 left-0 h-fill-available"
        @dragend="handleDragEnd"
    >
        <DropZones
            :is-dragging="isDraggingScreen"
            @drop="handleDropZone"
        />

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

                <div v-if="splitPanesStore.splitConfig?.active" class="fixed inset-0 top-[41px] flex flex-col">
                    <SplitPanes
                        :orientation="splitPanesStore.splitConfig.orientation"
                        @close="handleCloseSplit"
                    >
                        <template #pane-a>
                            <div class="flex flex-col h-full">
                                <div class="flex-shrink-0 z-[380]">
                                    <div class="flex h-[48px] p-1.5 items-center justify-between w-full overflow-x-auto">
                                        <Screens
                                            @toggleScreen="toggleScreen"
                                            @dragScreen="handleDragScreen"
                                        />

                                        <div class="p-0.5 px-1 right-2">
                                            <button
                                                v-if="!['home', 'livewire', 'queries'].includes(screenStore.screen)"
                                                @click="openScreenWindow"
                                                class="btn btn-sm p-[0.5rem] btn-circle border border-base-content/5"
                                            >
                                                <IconExternalLink class="w-4 text-base-content" />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div class="flex-1 overflow-auto min-h-0">
                                    <div v-if="screenStore.screen === 'jobs'">
                                        <JobView />
                                    </div>

                                    <div v-else-if="screenStore.screen === 'mail'">
                                        <MailView />
                                    </div>

                                    <div v-else-if="screenStore.screen === 'logs'">
                                        <LogView />
                                    </div>

                                    <div v-else-if="screenStore.screen === 'queries'">
                                        <QueriesView />
                                    </div>

                                    <div
                                        v-else
                                        class="flex flex-col rounded-sm text-base w-full h-full"
                                    >
                                        <HeaderColorsFilter v-if="hasColorsInPayload" />

                                        <div id="top"></div>

                                        <div class="w-full">
                                            <div
                                                id="dumps-base"
                                                class="w-full mb-[40px]"
                                                v-if="payloadStore.payload.length > 0"
                                                :class="{
                                                    'flex flex-col-reverse': settingsStore.settings.dump_order === 'normal'
                                                }"
                                            >
                                                <div
                                                    v-for="(group, groupKey) in groupedDumps"
                                                    :key="groupKey"
                                                    class="w-full px-3"
                                                >
                                                    <div
                                                        v-if="!['livewire'].includes(screenStore.screen)"
                                                        class="bg-base-200 flex-1 text-left pt-0 py-1.5 z-300 text-xs sticky top-0"
                                                    >
                                                        <span class="opacity-70 px-1" :title="groupKey">
                                                            {{ moment(groupKey).format("HH:mm:ss") }}
                                                        </span>
                                                    </div>

                                                    <div
                                                        v-for="payload in settingsStore.settings.dump_order === 'normal' ? group.slice().reverse() : group"
                                                        :key="payload.sf_dump_id"
                                                        :id="payload.id"
                                                        class="w-full"
                                                    >
                                                        <DumpItem
                                                            class="w-full group text-sm mb-3"
                                                            v-show="screenStore.screen !== 'livewire'"
                                                            :payload="payload"
                                                            :show-time="false"
                                                            @delete-dump="deleteDump"
                                                        />
                                                    </div>
                                                </div>

                                                <DumpLivewire v-if="screenStore.screen === 'livewire'" />
                                            </div>

                                            <div
                                                v-if="dumpsBagFiltered.length === 0 && !['jobs', 'mail', 'logs', 'queries', 'home'].includes(screenStore.screen)"
                                                class="flex items-center justify-center w-full h-full py-20"
                                            >
                                                <div class="text-center">
                                                    <SvgEmpty class="w-30 opacity-25 mx-auto" />
                                                    <div class="text-base-content/70">
                                                        <h1 class="text-lg font-semibold mb-2">Empty</h1>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div id="bottom"></div>

                                        <WelcomePage
                                            v-if="payloadStore.payload.length === 0 && screenStore.screen === 'home'"
                                            class="w-full h-full"
                                        />
                                    </div>
                                </div>
                            </div>
                        </template>

                        <template #pane-b>
                            <div class="flex flex-col h-full overflow-hidden">
                                <div class="flex-shrink-0  h-[48px] px-3 py-1.5 items-center justify-between flex">
                                    <h2 class="text-sm font-semibold capitalize">{{ splitPanesStore.splitConfig.screenName }}</h2>
                                    <button
                                        @click="handleCloseSplit"
                                        class="btn border border-base-content/5 btn-sm p-[0.5rem] btn-circle z-[9999]"
                                        aria-label="Close split"
                                        title="Close split"
                                    >
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                        </svg>
                                    </button>
                                </div>

                                <div class="flex-1 overflow-auto min-h-0">
                                    <div v-if="splitPanesStore.splitConfig.screenName === 'jobs'">
                                        <JobView />
                                    </div>

                                    <div v-else-if="splitPanesStore.splitConfig.screenName === 'mail'">
                                        <MailView />
                                    </div>

                                    <div v-else-if="splitPanesStore.splitConfig.screenName === 'logs'">
                                        <LogView />
                                    </div>

                                    <div v-else-if="splitPanesStore.splitConfig.screenName === 'queries'">
                                        <QueriesView />
                                    </div>

                                    <div v-else class="p-3">
                                        <div
                                            v-if="payloadStore.get(splitPanesStore.splitConfig.screenName).length === 0"
                                            class="flex items-center justify-center h-full py-20"
                                        >
                                            <div class="text-center">
                                                <SvgEmpty class="w-30 opacity-25 mx-auto" />
                                                <div class="text-base-content/70">
                                                    <h1 class="text-lg font-semibold mb-2">Empty</h1>
                                                </div>
                                            </div>
                                        </div>

                                        <div v-else>
                                            <div
                                                v-for="payload in payloadStore.get(splitPanesStore.splitConfig.screenName)"
                                                :key="payload.sf_dump_id"
                                                class="w-full mb-3"
                                            >
                                                <DumpItem
                                                    class="w-full group text-sm"
                                                    :payload="payload"
                                                    :show-time="true"
                                                    @delete-dump="deleteDump"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </template>
                    </SplitPanes>
                </div>

                <div v-else>
                    <div class="flex flex-col flex-1 absolute inset-0 overflow-hidden">
                        <main class="flex flex-col flex-1 min-h-full space-y-1">
                            <div class="flex z-[380]">
                                <div class="flex h-[48px] p-1.5 items-center justify-between w-full overflow-x-auto">
                                    <Screens
                                        @toggleScreen="toggleScreen"
                                        @dragScreen="handleDragScreen"
                                    />

                                    <div class="p-0.5 px-1 right-2">
                                        <button
                                            v-if="!['home', 'livewire', 'queries'].includes(screenStore.screen)"
                                            @click="openScreenWindow"
                                            class="btn btn-sm p-[0.5rem] btn-circle border border-base-content/5"
                                        >
                                            <IconExternalLink class="w-4 text-base-content" />
                                        </button>
                                    </div>
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
                                <QueriesView class="h-[calc(100vh-85px)] text-base" />
                            </div>

                            <div
                                v-else
                                :class="{
                                    'items-center': payloadStore.payload.length === 0
                                }"
                                class="flex flex-col rounded-sm text-base h-[calc(100vh-85px)] w-[100vw] overflow-auto"
                            >
                                <HeaderColorsFilter v-if="hasColorsInPayload" />

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
                                            v-for="(group, groupKey) in groupedDumps"
                                            :key="groupKey"
                                            class="w-full px-3"
                                        >
                                            <div
                                                v-if="!['livewire'].includes(screenStore.screen)"
                                                class="bg-base-200 flex-1 text-left pt-0 py-1.5 z-300 text-xs sticky top-0"
                                            >
                                                <span
                                                    class="opacity-70 px-1"
                                                    :title="groupKey"
                                                >
                                                    {{ moment(groupKey).format("HH:mm:ss") }}
                                                </span>
                                            </div>

                                            <div
                                                v-for="payload in settingsStore.settings.dump_order === 'normal' ? group.slice().reverse() : group"
                                                :key="payload.sf_dump_id"
                                                :id="payload.id"
                                                class="w-full"
                                            >
                                                <DumpItem
                                                    class="w-full group text-sm mb-3"
                                                    v-show="screenStore.screen !== 'livewire'"
                                                    :payload="payload"
                                                    :show-time="false"
                                                    @delete-dump="deleteDump"
                                                />
                                            </div>
                                        </div>

                                        <DumpLivewire v-if="screenStore.screen === 'livewire'" />
                                    </div>

                                    <div
                                        v-if="dumpsBagFiltered.length === 0 && !['jobs', 'mail', 'logs', 'queries', 'home'].includes(screenStore.screen)"
                                        class="-mt-[90px] -ml-8 absolute flex items-center justify-center w-full"
                                        style="height: -webkit-fill-available"
                                    >
                                        <SvgEmpty class="w-30 opacity-25" />
                                        <div class="text-base-content/70">
                                            <h1 class="text-lg font-semibold mb-2">Empty</h1>
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
    </div>
</template>
