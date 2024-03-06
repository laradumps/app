<script lang="ts" setup>
import { computed, markRaw, nextTick, onBeforeMount, onMounted, ref } from "vue";
import ThePackageUpdateInfo from "@/components/ThePackageUpdateInfo.vue";
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
import { Payload, ScreenPayload } from "@/types/Payload";
import * as Helper from "@/helpers";
import moment from "moment/moment";
import humanizeDuration from "humanize-duration";
import TheNavBar from "@/components/TheNavBar.vue";
import AppSetting from "@/components/AppSetting.vue";
import DumpItem from "@/components/DumpItem.vue";
import WelcomePage from "@/components/WelcomePage.vue";
import AutoUpdater from "@/components/AutoUpdater.vue";
import HeaderQueryRequests from "@/components/HeaderQueryRequests.vue";
import { usePrivacy } from "@/store/privacy";
import { useIDEHandler } from "@/store/ide-handler";
import DumpScreens from "@/components/DumpScreens.vue";
import QueriesControl from "@/components/QueriesControl.vue";

markRaw(ThePackageUpdateInfo);
markRaw(TheUpdateModalInfo);

const defaultScreen = ref({
    screen_name: "screen 1",
    raise_in: 0
});

const appVersion = ref("");
const localShortcutList = ref([]);

const payload = ref([]);
const screens = ref([]);
const dumpsBag = ref([]);
const inSavedDumpsWindow = ref(false);
const applicationPath = ref("");

const screenStore = useScreenStore();
const appearanceStore = useAppearanceStore();
const reorderStore = useReorder();
const settingStore = useSettingStore();
const timeStore = useTimeStore();
const colorStore = useColorStore();
const globalSearchStore = useGlobalSearchStore();
const privacyStore = usePrivacy();
const IDEHandler = useIDEHandler();

const i18n = useI18n({
    useScope: "global"
});
const localeStore = useI18nStore();

window.ipcRenderer.on("changeTheme", (event, args) => {
    appearanceStore.setTheme(args.theme);
});

window.ipcRenderer.on("settings:set-language", (event, args) => {
    localeStore.set(args.value);
    i18n.locale.value = args.value;
    location.reload();
});

window.ipcRenderer.on("settings:check-for-updates", (event, args) => {
    localStorage.autoUpdate = args.value;
});

window.ipcRenderer.on("changeIDE", (event, args) => {
    IDEHandler.value = args.value;
});

window.ipcRenderer.on("debug", (event, args) => {
    console.log(event, args);
});

onBeforeMount(() => {
    /**
     * Sets the current locale for internationalization (i18n) before the component is mounted.
     */
    i18n.locale.value = localeStore.value;
    localStorage.updateAvailable = "false";
});

/**
 * Computes whether there are any payloads with a "color" property.
 * @returns {boolean} True if there are payloads with a "color" property, otherwise false.
 */
const hasColor = computed(() => {
    return payload.value.filter((payload) => payload.hasOwnProperty("color")).length > 0;
});

/**
 * Filters and sorts payloads based on search criteria and color filtering.
 * @returns {Array} An array of filtered and sorted payloads.
 */
const dumpsBagFiltered = computed(() => {
    /**
     * Helper function to sort payloads in reverse time order.
     * @param {boolean} reversed - Indicates whether the sorting order is reversed.
     * @returns {Function} A comparison function for sorting payloads.
     */
    const reverseTimeOrder = (reversed: boolean) => {
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

    return dumpsBag.value
        .filter(
            (dump) =>
                JSON.stringify(dump[dump.type] ?? "")
                    .toString()
                    ?.toLowerCase()
                    .includes(globalSearchStore.search.toLowerCase()) || dump.label?.toLowerCase().includes(globalSearchStore.search.toLowerCase())
        )
        .filter((dump) => {
            if (colorStore.colors.length > 0) {
                return colorStore.colors.includes(dump.color);
            }

            return true;
        })
        .sort(sort());
});

/**
 * Adds a screen to the `screens` array if it doesn't already exist.
 * @param {Object} param - The screen object to be added.
 */
const addScreen = (param) => {
    const screenExists = screens.value.filter((screen: ScreenPayload) => screen.screen_name === param.screen_name).length > 0;

    if (!screenExists) {
        screens.value.push(param);
    }
};

/**
 * Maximizes the application window if `autoInvokeApp` is truthy.
 * @param {string|boolean} autoInvokeApp - Indicates whether to automatically invoke the application.
 */
const maximizeApp = (autoInvokeApp: string | boolean): void => {
    if (autoInvokeApp) {
        window.ipcRenderer.send("main:show");
    }
};

/**
 * Toggles the active screen and updates the `dumpsBag` based on the selected screen.
 * @param {string} value - The name of the screen to be toggled.
 */
const toggleScreen = async (value: string): Promise<void> => {
   // clearInterval(interval.value);
    interval.value = null

    screenStore.activeScreen(value);

    dumpsBag.value = payload.value.filter((payload) => payload.type !== "screen" && payload.screen.screen_name === value);

    nextTick(() =>
        document.getElementById("top").scrollIntoView({
            behavior: "smooth"
        })
    );
    //
    // if (screenStore.screen === "Queries") {
    //     setTimeout(() => {
    //         const lastPayload: Payload = dumpsBag.value[dumpsBag.value.length - 1];
    //         if (lastPayload) timeStore.selected = lastPayload.request_id;
    //     }, 800);
    // }
};

/**
 * Dispatches an event with a specific type, event, and content. Updates the payload and screen information based on the content type.
 * @param {string} type - The type of the event.
 * @param {string} event - The name of the event.
 * @param {Object} content - The content of the event.
 */

type EventType = "label" | "color" | "screen" | "dump";

const interval = ref(null);

const dispatch = (type: string, event: EventType, content: any): void => {
    if (applicationPath.value != content.application_path) {
        window.ipcRenderer.send("environment::check", {
            applicationPath: content.application_path
        });
        applicationPath.value = content.application_path;
    }

    content.rendered = false;
    settingStore.setting = false;

    let screenName = "screen 1";

    if (content.type === "screen") {
        payload.value.filter((dump: Payload) => dump.id === content.id).map((dump: Payload) => (dump.screen = content.screen));

        addScreen(content.screen);
    } else {
        content.screen = defaultScreen.value;
        payload.value.push(content);
    }

    screenName = content.screen.screen_name;
    if (!["Logs", "Queries"].includes(screenName)) {
        const autoInvokeApp = typeof content.meta === "object" ? content.meta.auto_invoke_app : true;

        maximizeApp(autoInvokeApp);
    }

    payload.value.map((dump: Payload) => {
        if (typeof dump.date_time == "undefined") {
            dump.date_time = moment().format("hh:mm:ss a");
        }
    });

    setTimeout(() => toggleScreen(content.screen.screen_name));
    // if (interval.value == null) {
    //     interval.value = setInterval( () => {
    //          setTimeout(() => toggleScreen("screen 1"), 50);
    //          setTimeout(() => toggleScreen(content.screen.screen_name), 100);
    //     }, 700);
    // }
};

/**
 * Loads all saved payloads and sets the document title accordingly.
 */
const loadAllSavedPayload = (): void => {
    document.title = "LaraDumps - Saved";
    window.ipcRenderer.send("saved-dumps:load");
};

/**
 * Sets the zoom level of the application window and handles zooming using the mousewheel event.
 * @param {number} value - The initial zoom factor.
 */
const getZoomLevel = (value): void => {
    let zoomFactor = value;

    window.webFrame.setZoomFactor(zoomFactor);

    document.querySelector("body").addEventListener(
        "mousewheel",
        (e) => {
            if (e.ctrlKey) {
                let value;
                e.preventDefault();

                value = e.deltaY > 0 ? (zoomFactor -= 0.1) : (zoomFactor += 0.1);

                window.ipcRenderer.send("main:update-zoom-level", value);

                window.webFrame.setZoomFactor(value);
            }
        },
        {
            passive: false
        }
    );
};

/**
 * Clears all data and resets the application to its initial state.
 */
const clearAll = (): void => {
    dumpsBag.value = [];
    payload.value = [];
    screens.value = [];
    screens.value.push(defaultScreen.value);
    timeStore.clear();
    screenStore.activeScreen("screen 1");
    globalSearchStore.clear();
    colorStore.clear();
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

onMounted(() => {
    setTimeout(() => (document.title = "LaraDumps - " + appVersion.value), 300);

    window.ipcRenderer.on("app:local-shortcut::count", (event, arg) => {
        if (arg === 0) {
            registerDefaultLocalShortcuts();
        }
    });

    window.ipcRenderer.on("dump", (event, { content }) => dispatch("dump", event, content));

    window.ipcRenderer.send("main:os-temp-dir");

    window.ipcRenderer.on("app:os-temp-dir", (event, value) => getZoomLevel(value));

    window.ipcRenderer.send("main:get-app-version");

    window.ipcRenderer.on("main:app-version", (event, arg) => setTimeout(() => (appVersion.value = `v${arg.version}`), 100));

    window.ipcRenderer.on("main:update-available", (event, arg) => {
        console.log(arg);
    });

    addScreen(defaultScreen.value);

    window.ipcRenderer.on("app:load-all-saved-dumps", async (event, args) => {
        inSavedDumpsWindow.value = true;
        clearAll();

        await loadAllSavedPayload();
    });

    window.ipcRenderer.on("app:render-all-saved-dumps", (event, content) => {
        try {
            const payload = JSON.parse(content);
            dispatch(payload.type, event, payload);
        } catch (e) {
            console.log(e);
        }
    });

    window.ipcRenderer.on("clear", () => clearAll());

    window.ipcRenderer.on("app:local-shortcut-execute::clearAll", () => clearAll());

    if (appearanceStore.theme === "auto") {
        window.ipcRenderer.send("native-theme", appearanceStore.theme);
    }

    window.ipcRenderer.on("app:theme-dark", () => {
        if (appearanceStore.theme === "auto") {
            appearanceStore.setTheme("dim");
        }
    });

    window.ipcRenderer.on("app:theme-light", () => {
        if (appearanceStore.theme === "auto") {
            appearanceStore.setTheme("dim");
        }
    });

    window.ipcRenderer.on("app::toggle-privacy", () => privacyStore.toggle());
    window.ipcRenderer.on("app::toggle-reorder", () => reorderStore.toggle());
    window.ipcRenderer.on("app::toggle-settings", () => settingStore.toggle());
    window.ipcRenderer.on("app::show-saved-dumps", () => window.ipcRenderer.send("saved-dumps:show"));

    window.ipcRenderer.on("app:local-shortcut::list", (event, arg) => {
        localShortcutList.value = arg;
    });

    window.ipcRenderer.on("html", (event, { content }) => dispatch("html", event, content));

    window.ipcRenderer.on("mailable", (event, { content }) => dispatch("mailable", event, content));

    window.ipcRenderer.on("table_v2", (event, { content }) => dispatch("table_v2", event, content));

    window.ipcRenderer.on("mail", (event, { content }) => {
        const filterPayload: boolean =
            payload.value.filter((payload: Payload) => {
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
        payload.value
            .filter((globalPayload) => globalPayload.id === content.id)
            .map((globalPayload) => {
                globalPayload.label = content.label.label;
                return payload;
            });
    });

    window.ipcRenderer.on("color", (event, { content }) => {
        payload.value
            .filter((globalPayload: Payload) => globalPayload.id === content.id)
            .map((globalPayload: Payload) => {
                globalPayload.color = content.color;
                return payload;
            });
    });

    window.ipcRenderer.on("ipc:package-down", (event, arg) => {
        console.log(arg);
    });

    window.ipcRenderer.on("table", (event, { content }) => {
        payload.value = payload.value.filter((payload: Payload) => {
            if (payload.type === "table") {
                return payload.type === "table";
            }
            return true;
        });

        dispatch("table", event, content);
    });

    window.ipcRenderer.on("http-client", (event, { content }) => dispatch("http-client", event, content));

    window.ipcRenderer.on("model", (event, { content }) => dispatch("model", event, content));

    window.ipcRenderer.on("log_application", (event, { content }) => {
        let color;
        switch (content.log_application.level) {
            case "error":
            case "critical":
            case "alert":
            case "emergency":
                color = "red";
                break;
            case "warning":
                color = "orange";
                break;
            case "notice":
                color = "green";
                break;
            case "info":
                color = "blue";
                break;
            case "debug":
                color = "gray";
                break;
            default:
        }

        content.color = color;
        content.label = content.log_application.level;

        dispatch("log_application", event, content);
    });

    window.ipcRenderer.on("color", (event, { content }) => {
        payload.value.filter((globalPayload: Payload) => globalPayload.id === content.id).map((globalPayload: Payload) => (globalPayload.color = content.color.color));
    });

    window.ipcRenderer.on("screen", (event, { content }) => dispatch("screen", event, content));

    window.ipcRenderer.on("json_validate", (event, { content }) => {
        let toValidate;
        const filterPayload: Payload = payload.value.filter((payload) => payload.id === content.id)[0];

        if (filterPayload.hasOwnProperty("dump")) {
            toValidate = filterPayload.dump?.original_content;
        }

        if (filterPayload.hasOwnProperty("json")) {
            toValidate = filterPayload.json?.original_content;
        }

        payload.value
            .filter((globalPayload: Payload) => globalPayload.id === content.id)
            .map((globalPayload: Payload) => {
                globalPayload.validate_json = true;
                globalPayload.is_json = Helper.isJson(toValidate);
                return payload;
            });
    });

    window.ipcRenderer.on("validate", (event, { content }) => {
        let textContent;
        const filterPayload = payload.value.filter((globalPayload: Payload) => globalPayload.id === content.id)[0];

        if (filterPayload.hasOwnProperty("json")) {
            textContent = filterPayload.json.original_content;
        }

        if (filterPayload.hasOwnProperty("dump")) {
            textContent = filterPayload.dump.original_content;
        }

        const strContains = Helper.strContains(textContent, content.validate.content, {
            is_case_sensitive: content.validate.is_case_sensitive,
            is_whole_word: content.validate.is_whole_word
        });

        payload.value
            .filter((globalPayload: Payload) => globalPayload.id === content.id)
            .map((globalPayload: Payload) => {
                globalPayload.str_contains = strContains;
                return payload;
            });
    });

    window.ipcRenderer.on("json", (event, { content }) => dispatch("screen", event, content));

    window.ipcRenderer.on("queries", (event, { content }) => dispatch("queries", event, content));

    window.ipcRenderer.on("query", (event, { content }) => dispatch("query", event, content));

    window.ipcRenderer.on("coffee", (event, arg) => window.ipcRenderer.send("main:grab-a-coffee", arg));

    window.ipcRenderer.on("time_track", (event, { content }) => {
        const exist = payload.value.filter((globalPayload: Payload) => globalPayload.label === content.time_track.label);

        if (exist.length === 0) {
            dispatch("time-track", event, content);

            return;
        }

        const _end = moment.unix(content.time_track.end_time);
        const _start = moment.unix(exist[0].time_track.time);
        const duration = moment.duration(_start.diff(_end));
        const elapsedTime = humanizeDuration(duration.asMilliseconds());

        payload.value.filter((globalPayload) => globalPayload.label === content.time_track.label).map((globalPayload) => (globalPayload.time_track.elapsed_time = elapsedTime));
    });

    window.ipcRenderer.on("coffee", (event, arg) => {
        window.ipcRenderer.send("coffee:grab-a-coffee", arg);
    });

    //* * Convert shortcuts to Electron format **/
    Object.defineProperty(String.prototype, "beautifyShortcut", {
        value() {
            if (process.platform === "darwin") {
                return this.replace("CommandOrControl", "⌘").replace("Shift", "⇧").replace("Option", "⌥");
            }
            return this.replace("CommandOrControl", "⊞").replace("Shift", "⇧").replace("Option", "⌥");
        }
    });

    Object.defineProperty(String.prototype, "toElectronFormat", {
        value() {
            return this.replace("", "CommandOrControl").replace("⌃", "CommandOrControl").replace("⌘", "CommandOrControl").replace("⇧", "Shift").replace("⌥", "Option");
        }
    });

});
</script>
<template>
    <div
        v-cloak
        id="app"
    >
        <div
            :data-theme="appearanceStore.theme"
            class="absolute w-full h-full min-h-full"
        >
            <div>
                <TheNavBar
                    v-if="!settingStore.setting"
                    v-model:in-saved-dumps-window="inSavedDumpsWindow"
                    v-model:payload-count="payload.length"
                    @clear-all="clearAll($event)"
                />

                <!-- content -->
                <div class="flex overflow-hidden flex-col flex-1 right-0 absolute left-0 h-fill-available">
                    <!-- main -->
                    <main
                        :class="{
                            'overflow-auto': payload.length > 0
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

                        <AutoUpdater />

                        <!-- screen buttons -->
                        <div
                            v-if="screens.length > 1 && !settingStore.setting"
                            class="flex"
                        >
                            <div class="py-1 flex-1 px-3">
                                <div class="flex items-center justify-between overflow-x-auto">
                                    <div class="flex">
                                        <DumpScreens
                                            @toggleScreen="toggleScreen"
                                            v-model:screens="screens"
                                            v-model:payload="payload"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div
                            :class="{
                                'w-auto p-6 pb-8 items-center': payload.length === 0,
                                'h-[100vh] w-[100vw] flex': payload.length === 0 && !settingStore.setting
                            }"
                            class="rounded-sm text-base overflow-auto"
                        >
                            <div id="top"></div>

                            <div
                                class="px-3"
                                v-if="screenStore.screen === 'Queries'"
                            >
                                <HeaderQueryRequests
                                    :payload="payload"
                                    :total="dumpsBagFiltered.length"
                                    :total-filtered="dumpsBagFiltered.filter((payload: Payload) => payload.request_id === timeStore.selected).length"
                                />
                            </div>

                            <div :class="{'flex divide' : screenStore.screen === 'Queries' }">
                                <div v-if="screenStore.screen === 'Queries'"
                                     class="pl-3 pt-2">
                                    <QueriesControl />
                                </div>
                                <div
                                    class="mb-[60px] w-full"
                                    :class="{
                                        'flex flex-col-reverse': reorderStore.reverse
                                    }"
                                    v-if="payload.length > 0 && !settingStore.setting"
                                >
                                    <div
                                        class="w-full"
                                        :id="payload.id"
                                        v-for="payload in dumpsBagFiltered"
                                        :key="payload.sf_dump_id"
                                    >
                                        <DumpItem
                                            :in-saved-dumps-window="inSavedDumpsWindow"
                                            v-show="screenStore.screen === 'Queries' ? payload.request_id === timeStore.selected : true"
                                            :payload="payload"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div
                                class="w-full h-full -mt-6"
                                v-if="payload.length === 0 && !settingStore.setting"
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
