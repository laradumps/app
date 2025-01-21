<script lang="ts" setup>
import { computed, markRaw, nextTick, onBeforeMount, onMounted, ref } from "vue";
import TheUpdateModalInfo from "@/components/TheUpdateModalInfo.vue";
import { useScreenStore } from "@/store/screen";
import { useAppearanceStore } from "@/store/appearance";
import { useI18nStore } from "@/store/i18n";
import { useReorder } from "@/store/reorder";
import { useSettingStore } from "@/store/setting";
import { useTimeStore } from "@/store/time";
import { useGlobalSearchStore } from "@/store/global-search";
import { useI18n } from "vue-i18n";
import { useColorStore } from "@/store/colors";
import { Payload } from "@/types/Payload";
import * as Helper from "@/helpers";
import moment from "moment/moment";
import TheNavBar from "@/components/TheNavBar.vue";
import AppSetting from "@/components/AppSetting.vue";
import DumpItem from "@/components/DumpItem.vue";
import WelcomePage from "@/components/WelcomePage.vue";
import HeaderQueryRequests from "@/components/HeaderQueryRequests.vue";
import { useIDEHandlerStore } from "@/store/ide-handler";
import DumpScreens from "@/components/DumpScreens.vue";
import TheAppUpdateInfo from "@/components/TheAppUpdateInfo.vue";
import DumpLivewire from "@/components/DumpLivewire.vue";
import ScreenWindow from "@/components/ScreenWindow.vue";
import { usePayloadStore } from "@/store/payload";
import { useScrollDirection } from "@/store/scroll-direction";
import { useQueryDuplicated } from "@/store/query-duplicated";

markRaw(TheUpdateModalInfo);

const screenStore = useScreenStore();
const appearanceStore = useAppearanceStore();
const reorderStore = useReorder();
const settingStore = useSettingStore();
const timeStore = useTimeStore();
const colorStore = useColorStore();
const globalSearchStore = useGlobalSearchStore();
const IDEHandler = useIDEHandlerStore();
const payloadStore = usePayloadStore();
const scrollDirection = useScrollDirection();

const { locale } = useI18n({ useScope: "global" });
const localeStore = useI18nStore();

const defaultScreen = ref({
    screen_name: "screen 1",
    raise_in: 0,
    visible: true,
    pinned: false,
    new_window: false
});
const appVersion = ref("");
const localShortcutList = ref([]);

const payload = ref([]);

const dumpsBag = ref([]);
const inSavedDumpsWindow = ref(false);

const inScreenWindow = ref(false);
const payloadScreen = ref([]);

const applicationPath = ref("");
const livewireRequests = ref([]);
const isPaused = ref(false);

const allRequests = ref([]);

onBeforeMount(() => {
    locale.value = localeStore.value;
    localStorage.updateAvailable = "false";
});

onMounted(() => {
    IDEHandler.setValue(localStorage.IDEHandler);
    appearanceStore.setTheme(localStorage.theme);

    setDefaultCheckForUpdates();
    setTimeout(() => (document.title = "LaraDumps - " + appVersion.value), 200);
    addScreen(defaultScreen.value);

    window.ipcRenderer.on("app:pause-dumps", (event, arg) => (isPaused.value = arg));

    window.ipcRenderer.on("app:local-shortcut::count", (event, arg) => {
        arg === 0 && registerDefaultLocalShortcuts();
    });

    window.ipcRenderer.on("dump", (event, { content }) => dispatch("dump", event, content));

    window.ipcRenderer.send("main:app-version");
    window.ipcRenderer.on("main:app-version.reply", (event, arg) => setTimeout(() => (appVersion.value = `v${arg.version}`), 100));

    window.ipcRenderer.on("app:load-all-saved-dumps", async () => {
        inSavedDumpsWindow.value = true;
        // clearAll();

        await loadAllSavedPayload();
    });

    window.ipcRenderer.on("app:screen-window-enable", async (event, args) => {
        inScreenWindow.value = args.screen;
        payloadScreen.value = args.payload;

        setTimeout(() => (document.title = "LaraDumps - " + args.screen), 200);
    });

    window.ipcRenderer.on("app:screen-window-update", async (event, args) => {
        payloadScreen.value = args.payload;
    });

    window.ipcRenderer.on("app:render-all-saved-dumps", (event, content) => {
        try {
            const payload = JSON.parse(content);
            dispatch(payload.type, event, payload);
        } catch (e) {
            console.log(e);
        }
    });

    if (appearanceStore.value === "auto") {
        window.ipcRenderer.send("native-theme", appearanceStore.value);
    }

    window.ipcRenderer.on("app:theme-dark", () => {
        appearanceStore.value === "auto" && appearanceStore.setTheme("dim");
    });

    window.ipcRenderer.on("app:theme-light", () => {
        appearanceStore.value === "auto" && appearanceStore.setTheme("light");
    });

    window.ipcRenderer.on("app::scroll-direction", (event, args) => {
        reorderStore.set(args.value);
        scrollDirection.set(args.value);

        document.getElementById(args.value).scrollIntoView({
            behavior: "smooth"
        });
    });

    window.ipcRenderer.on("app::toggle-settings", () => settingStore.toggle());

    window.ipcRenderer.on("app::show-saved-dumps", () => window.ipcRenderer.send("saved-dumps:show"));

    window.ipcRenderer.send("local-shortcut:get");

    window.ipcRenderer.on("app:local-shortcut::list", (event, arg) => {
        localShortcutList.value = arg;
    });

    dumpListeners();
    mainMenuListeners();

    window.ipcRenderer.send("storage.get");
});

const setDefaultCheckForUpdates = () => {
    if (typeof localStorage.autoUpdate === "undefined") {
        localStorage.autoUpdate = "automatic";
    }
};

const dumpListeners = () => {
    window.ipcRenderer.on("livewire", (event, { content }) => {
        livewireRequests.value.push(content);
        dispatch("livewire", event, content);
    });

    window.ipcRenderer.on("html", (event, { content }) => dispatch("html", event, content));
    window.ipcRenderer.on("mailable", (event, { content }) => dispatch("mailable", event, content));
    window.ipcRenderer.on("table_v2", (event, { content }) => dispatch("table_v2", event, content));
    window.ipcRenderer.on("mail", (event, { content }) => {
        const filterPayload: boolean =
            payloadStore.payload.filter((payload: Payload) => {
                if (payload.hasOwnProperty("mail")) {
                    return payload.mail.messageId == content.mail.messageId;
                }

                return false;
            }).length > 0;

        if (!filterPayload) {
            dispatch("mail", event, content);
        }
    });

    window.ipcRenderer.on("label", (event, { content }) => payloadStore.updateLabelPayload(content));
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
        dispatch("screen", event, content);
        payloadStore.updateScreenPayload(content);
    });
    window.ipcRenderer.on("json_validate", (event, { content }) => {
        payloadStore.updateJSONValidatePayload(content);
    });
    window.ipcRenderer.on("validate", (event, { content }) => {
        payloadStore.updateValidatePayload(content);
    });
    window.ipcRenderer.on("json", (event, { content }) => dispatch("screen", event, content));
    window.ipcRenderer.on("queries", (event, { content }) => dispatch("queries", event, content));
    window.ipcRenderer.on("query", (event, { content }) => dispatch("query", event, content));
    window.ipcRenderer.on("time_track", (event, { content }) => {
        const exist = payloadStore.payload.filter((globalPayload: Payload) => globalPayload.label === content.time_track.label);

        if (exist.length === 0) {
            dispatch("time-track", event, content);

            return;
        }

        payloadStore.updateTimeTrackPayload(content);
    });
};

const mainMenuListeners = () => {
    // set
    window.ipcRenderer.send("main-menu:set-ide-handler-selected", { value: localStorage.IDEHandler });
    window.ipcRenderer.send("main-menu:set-theme-selected", { value: localStorage.theme });

    // get
    window.ipcRenderer.on("changeTheme", (event, args) => {
        window.ipcRenderer.send("main-menu:set-theme-selected", { value: args.value });
        appearanceStore.setTheme(args.value);
    });

    window.ipcRenderer.on("changeIDE", (event, args) => {
        window.ipcRenderer.send("main-menu:set-ide-handler-selected", { value: args.value });
        IDEHandler.setValue(args.value);
    });

    window.ipcRenderer.on("changeAutoLaunch", (event, args) => {
        window.ipcRenderer.send("set-auto-launch", { value: args.value });
    });

    window.ipcRenderer.on("settings:set-language", (event, args) => {
        localeStore.set(args.value);
        locale.value = localeStore.value;
        location.reload();
    });
};

window.ipcRenderer.on("settings:check-for-updates", (event, args) => {
    localStorage.autoUpdate = args.value;
});

window.addEventListener("update-payload", (event) => {
    console.log(payloadStore.get(inScreenWindow.value));
});

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
        .filter((payload: Payload) => payload.type === "queries")
        .forEach((payload: Payload) => {
            const sql = payload.queries?.sql || "";

            const isDuplicate = dumps.filter((payload1: Payload) => payload1.type === "queries" && payload1.request_id === payload.request_id && payload1.queries.sql === sql);

            queryDuplicatedStore.add(payload.request_id, sql, isDuplicate.length > 1, isDuplicate.length);
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
    screenStore.add(param);
};

const maximizeApp = (autoInvokeApp: string | boolean): void => {
    autoInvokeApp && window.ipcRenderer.send("main:show");
};

const toggleScreen = async (value: string): Promise<void> => {
    if (screenStore.get(value) && !screenStore.get(value).visible) {
        return;
    }

    clearInterval(interval.value);

    interval.value = null;

    screenStore.activeScreen(value);

    dumpsBag.value = payloadStore.payload.filter((payload) => payload.type !== "screen" && payload.screen.screen_name === value);

    await nextTick(() => {
        if (scrollDirection.isTop()) {
            document.getElementById("top").scrollIntoView({
                behavior: "smooth"
            });
        } else {
            document.getElementById("bottom").scrollIntoView({
                behavior: "smooth"
            });
        }
    });

    if (screenStore.screen === "Queries") {
        setTimeout(() => {
            const lastPayload: Payload = dumpsBag.value[dumpsBag.value.length - 1];
            if (lastPayload) timeStore.selected = lastPayload.request_id;
        }, 600);
    }
};

type EventType = "label" | "color" | "screen" | "dump";

const interval = ref(null);

const dispatch = (type: string, event: EventType, content: any): void => {
    if (isPaused.value) {
        return;
    }

    if (applicationPath.value != content.application_path) {
        window.ipcRenderer.send("storage.check", {
            applicationPath: content.application_path
        });
        applicationPath.value = content.application_path;
    }

    content.rendered = false;
    settingStore.setting = false;

    if (content.type === "screen") {
        addScreen(content.screen);
    } else {
        content.screen = defaultScreen.value;

        if (typeof content.date_time == "undefined") {
            content.date_time = moment().format("hh:mm:ss a");
        }

        payloadStore.add(content);
    }

    let screenName = content.screen.screen_name ?? "screen 1";

    if (!["Logs", "Queries"].includes(screenName)) {
        const autoInvokeApp = typeof content.meta === "object" ? content.meta.auto_invoke_app : true;

        maximizeApp(autoInvokeApp);
    }

    if (interval.value == null) {
        if (content.type === "queries" || content.type === "livewire") {
            interval.value = setInterval(() => setTimeout(() => toggleScreen(content.screen.screen_name), 50), 700);
        } else {
            setTimeout(() => toggleScreen(content.screen.screen_name), 50);
        }
    }

    const serializablePayload = JSON.parse(JSON.stringify(payload.value.filter((payload: Payload) => payload.screen?.screen_name === content.screen.screen_name)));

    if (content.screen.new_window) {
        screenStore.hidden(content.screen.screen_name);

        window.ipcRenderer.send("screen-window:show", {
            screen: content.screen.screen_name,
            payload: serializablePayload,
            position: {}
        });

        setTimeout(() => toggleScreen(content.screen.screen_name), 200);
    } else {
        window.ipcRenderer.send("send-screen-window-update", {
            screen: content.screen.screen_name,
            payload: serializablePayload
        });
    }
};

const loadAllSavedPayload = (): void => {
    document.title = "LaraDumps - Saved";
    window.ipcRenderer.send("saved-dumps:load");
};

function registerDefaultLocalShortcuts() {
    let shortcutClearAllObject = {
        alias: "clearAll",
        label: "settings.shortcut.clear",
        shortcut: "ds_shortcut_clearAll",
        originalValue: process.platform === "darwin" ? "⌥+⇧+K" : "Ctrl+Shift+K",
        keys: process.platform === "darwin" ? "Alt+Shift+K" : "Ctrl+Shift+K"
    };
    window.ipcRenderer.send("local-shortcut:set", shortcutClearAllObject);
}
</script>
<template>
    <div
        v-cloak
        id="app"
        :data-theme="appearanceStore.value"
        :class="{ absolute: !inScreenWindow }"
        class="flex overflow-hidden flex-col flex-1 right-0 left-0 h-fill-available"
    >
        <ScreenWindow
            v-if="inScreenWindow"
            :dumps-bag="payloadScreen"
            v-model:screen="inScreenWindow"
        />

        <div
            v-else
            class="absolute w-full h-full min-h-full"
        >
            <div>
                <TheAppUpdateInfo />

                <div
                    v-if="isPaused"
                    class="bg-warning tracking-wider text-center uppercase text-warning-content text-xs py-1 my-1"
                >
                    {{ $t("is_paused") }}
                </div>

                <!-- content -->
                <div class="flex overflow-hidden flex-col flex-1 right-0 absolute left-0 h-fill-available">
                    <!-- main -->
                    <main
                        :class="{
                            'overflow-auto': payloadStore.payload.length > 0
                        }"
                        class="flex-1 flex flex-col shrink-0 left-16 right-0 min-h-full"
                    >
                        <!-- AppSettings -->
                        <div
                            class="overflow-auto min-h-screen pb-8"
                            v-if="settingStore.setting"
                        >
                            <AppSetting :local-shortcut-list="localShortcutList" />
                        </div>

                        <!-- screen buttons -->
                        <div
                            v-if="screenStore.screens.length > 1 && !settingStore.setting"
                            class="flex"
                        >
                            <div class="flex-1 px-3">
                                <div class="flex items-center justify-between overflow-x-auto">
                                    <div class="flex">
                                        <DumpScreens @toggleScreen="toggleScreen" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div
                            :class="{
                                'mt-[7.6rem]': screenStore.screen === 'Queries',
                                'w-auto p-6 pb-8 items-center': payloadStore.payload.length === 0,
                                'h-[100vh] w-[100vw] flex': payloadStore.payload.length === 0 && !settingStore.setting
                            }"
                            class="rounded-sm text-base overflow-auto"
                        >
                            <div id="top"></div>

                            <div v-if="screenStore.screen === 'Queries'">
                                <HeaderQueryRequests
                                    :in-screen-window="inScreenWindow ? 'true' : 'false'"
                                    :all-requests="allRequests"
                                    :total="dumpsBagFiltered.length"
                                    :total-filtered="dumpsBagFiltered.filter((payload: Payload) => payload.request_id === timeStore.selected).length"
                                />
                            </div>

                            <div
                                :class="{
                                    flex: screenStore.screen === 'Queries'
                                }"
                            >
                                <div
                                    id="dumps-base"
                                    class="mb-[40px] w-full"
                                    :class="{
                                        'flex flex-col-reverse': reorderStore.reverse && screenStore.screen !== 'Queries'
                                    }"
                                    v-if="payloadStore.payload.length > 0 && !settingStore.setting"
                                >
                                    <div
                                        class="w-full"
                                        :id="payload.id"
                                        v-for="(payload, index) in dumpsBagFiltered"
                                        :key="payload.sf_dump_id"
                                    >
                                        <DumpItem
                                            :in-saved-dumps-window="inSavedDumpsWindow"
                                            v-show="screenStore.screen === 'Queries' ? payload.request_id === timeStore.selected : screenStore.screen !== 'Livewire'"
                                            :payload="payload"
                                        />
                                    </div>

                                    <div
                                        class="pt-2"
                                        v-if="screenStore.screen === 'Livewire'"
                                    >
                                        <DumpLivewire v-model:livewire-requests="livewireRequests" />
                                    </div>
                                </div>
                            </div>

                            <div id="bottom"></div>

                            <div
                                class="w-full h-full -mt-6"
                                v-if="payloadStore.payload.length === 0 && !settingStore.setting"
                            >
                                <WelcomePage :local-shortcut-list="localShortcutList" />
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </div>
    </div>
</template>
