<script lang="ts" setup>
import { computed, markRaw, nextTick, onBeforeMount, onMounted, ref } from "vue";
import TheUpdateModalInfo from "@/components/TheUpdateModalInfo.vue";
import { useScreenStore } from "@/store/screen";
import { useI18nStore } from "@/store/i18n";
import { useReorder } from "@/store/reorder";
import { useTimeStore } from "@/store/time";
import { useGlobalSearchStore } from "@/store/global-search";
import { useI18n } from "vue-i18n";
import { useColorStore } from "@/store/colors";
import { Payload } from "@/types/Payload";
import moment from "moment/moment";
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
import { useSettingsStore } from "@/store/settings";

markRaw(TheUpdateModalInfo);

const screenStore = useScreenStore();
const reorderStore = useReorder();
const timeStore = useTimeStore();
const colorStore = useColorStore();
const globalSearchStore = useGlobalSearchStore();
const IDEHandler = useIDEHandlerStore();
const payloadStore = usePayloadStore();
const scrollDirection = useScrollDirection();
const settingsStore = useSettingsStore();

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
});

onMounted(() => {
    IDEHandler.setValue(localStorage.IDEHandler);

    setTimeout(() => (document.title = "LaraDumps - " + appVersion.value), 200);
    addScreen(defaultScreen.value);

    window.ipcRenderer.on("app:pause-dumps", (event, arg) => (isPaused.value = arg));

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

    window.ipcRenderer.on("app:theme-dark", () => {
        settingsStore.settings.theme = "dim";
        document.documentElement.setAttribute("data-theme", "light");
        settingsStore.update();
    });

    window.ipcRenderer.on("app:theme-light", () => {
        settingsStore.settings.theme = "light";
        document.documentElement.setAttribute("data-theme", "light");
        settingsStore.update();
    });

    window.ipcRenderer.on("app::scroll-direction", (event, args) => {
        reorderStore.set(args.value);
        scrollDirection.set(args.value);

        document.getElementById(args.value).scrollIntoView({
            behavior: "smooth"
        });
    });

    window.ipcRenderer.on("app::show-saved-dumps", () => window.ipcRenderer.send("saved-dumps:show"));

    window.ipcRenderer.send("local-shortcut:get");

    dumpListeners();
    mainMenuListeners();

    window.ipcRenderer.send("storage.get");
});

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
        dispatch("screen", event, content);
        payloadStore.updateScreenPayload(content);
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
        const exist = payloadStore.payload.filter((globalPayload: Payload) => globalPayload.with_label.label === content.time_track.label);

        if (exist.length === 0) {
            dispatch("time-track", event, content);

            return;
        }

        payloadStore.updateTimeTrackPayload(content);
    });
};

const mainMenuListeners = () => {
    window.ipcRenderer.on("changeAutoLaunch", (event, args) => {});
};

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
    screenStore.add(param);
};

const maximizeApp = (autoInvokeApp: string | boolean): void => {
    autoInvokeApp && window.ipcRenderer.send("main:show");
};

const toggleScreen = async (value: string): Promise<void> => {
    if (screenStore.get(value) && !screenStore.get(value).visible) {
        return;
    }

    screenStore.activeScreen(value);

    dumpsBag.value = payloadStore.payload.filter((payload) => payload.type !== "screen" && payload.to_screen.screen_name === value);

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
        }, 50);
    }
};

type EventType = "label" | "color" | "screen" | "dump";

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

    if (typeof content.to_screen.screen_name == "string") {
        addScreen(content.to_screen);
    }

    if (content.type === "screen") {
        addScreen({
            ...content.to_screen,
            pinned: false,
            visible: true
        });
    } else {
        if (typeof content.date_time == "undefined") {
            content.date_time = moment().format("hh:mm:ss a");
        }

        payloadStore.add(content);
    }

    let screenName = content.to_screen.screen_name ?? "screen 1";

    if (!["Logs", "Queries"].includes(screenName)) {
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

    console.log(content.to_screen);
    setTimeout(() => toggleScreen(content.to_screen.screen_name), 100);
};

const loadAllSavedPayload = (): void => {
    document.title = "LaraDumps - Saved";
    window.ipcRenderer.send("saved-dumps:load");
};
</script>
<template>
    <div
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
            :data-theme="settingsStore.settings.theme"
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
                        <!-- screen buttons -->
                        <div
                            v-if="screenStore.screens.length > 1"
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
                                'h-[100vh] w-[100vw] flex': payloadStore.payload.length === 0
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
                                    v-if="payloadStore.payload.length > 0"
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
                                v-if="payloadStore.payload.length === 0"
                            >
                                <WelcomePage />
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </div>
    </div>
</template>
