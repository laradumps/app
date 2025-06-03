<script setup lang="ts">
import Divider from "../components/Divider.vue";
import { nextTick, onMounted, onUpdated, ref, watch } from "vue";
import { useSettingsStore } from "@/store/settings";
import SelectInput from "@/components/SelectInput.vue";
import { useI18n } from "vue-i18n";
import { useI18nStore } from "@/store/i18n";
import hotkeys from "hotkeys-js";

const editMode = ref(false);
const saved = ref(false);
const selected = ref<string | null>("settings");
const customTheme = ref("");

const settingsStore = useSettingsStore();

const i18n = useI18n();
const { locale } = useI18n({ useScope: "global" });
const localeStore = useI18nStore();

onMounted(() => {
    customTheme.value = settingsStore.settings.custom_css;
});

onUpdated(() => {
    if (selected.value === "shortcuts") {
        getSavedLocalShortcuts();

        nextTick(() => {
            detectHotKeysPress();
        });
    }
});

const saveSettings = async () => {
    saved.value = true;
    await settingsStore.update();
    setTimeout(() => {
        saved.value = false;
    }, 2000);
};

const saveTheme = async () => {
    if (settingsStore.settings.theme === "system") {
        await nextTick(() => saveSettings());
        window.ipcRenderer.send("native-theme");

        return;
    }

    if (settingsStore.settings.theme === "custom") {
        await nextTick(() => saveSettings());

        modal_custom_theme.showModal();
        return;
    }

    document.documentElement.setAttribute("data-theme", settingsStore.settings.theme);
    await nextTick(() => saveSettings());
};

const saveLanguage = async () => {
    localeStore.set(settingsStore.settings.language);
    locale.value = localeStore.value;

    await nextTick(() => saveSettings());
};

const saveIDEHandler = async () => {
    await nextTick(() => saveSettings());
};

const saveCheckForUpdates = async () => {
    await nextTick(() => saveSettings());
};

const saveAutoLaunch = async () => {
    window.ipcRenderer.send("set-auto-launch", { value: settingsStore.settings.auto_launch });

    await nextTick(() => saveSettings());
};

const saveScrollDirection = async () => {
    await nextTick(() => saveSettings());
};

const saveReverse = async () => {
    await nextTick(() => saveSettings());
};

const saveLimitDumps = async () => {
    await nextTick(() => saveSettings());
};

const getSavedLocalShortcuts = () => {
    window.ipcRenderer.send("local-shortcut:get");

    window.ipcRenderer.on("app:local-shortcut::list", (arg, shortcuts) => {
        shortcuts.forEach((shortcuts) => {
            if (shortcuts.hasOwnProperty("shortcut")) {
                const shortcut = shortcuts.shortcut.replace("ds_shortcut_", "");

                try {
                    if (document.getElementById(shortcut) !== null) {
                        document.getElementById(shortcut).value = shortcuts.keys.beautifyShortcut();
                    }
                } catch (err) {
                    console.log("Error: ", err);
                }
            }
        });
    });
};

const detectHotKeysPress = () => {
    let inputElements = null;

    const shortCutAll = [...document.getElementsByClassName("js-shortcut")];

    shortCutAll.forEach((input) =>
        input.addEventListener(
            "click",
            (event) => {
                inputElements = event.target;
            },
            false
        )
    );

    shortCutAll.forEach((input) =>
        input.addEventListener(
            "blur",
            () => {
                inputElements = null;
            },
            false
        )
    );

    //* * Detected key pressed **/
    hotkeys("*", () => {
        const keys = hotkeys.getPressedKeyString().join("+");

        if (typeof inputElements !== "undefined" && inputElements !== null) {
            inputElements.value = keys.beautifyShortcut();
        }
    });
};

const saveShortcuts = async () => {
    document.querySelectorAll(".js-shortcut").forEach((element) => {
        if (element.value.toString() !== "") {
            const shortcut = {
                label: element.dataset.label,
                originalValue: element.value,
                keys: element.value.toElectronFormat()
            };

            settingsStore.settings.shortcuts[element.name] = shortcut;

            window.ipcRenderer.send("local-shortcut:set", shortcut);
        }
    });

    await saveSettings();

    window.ipcRenderer.send("settings.init-shortcuts");

    alert(i18n.t("settings.shortcut.save_message"));

    editMode.value = false;
};

watch(settingsStore.settings, async (value, oldValue) => {
    if (!settingsStore.settings.show_badge_count) {
        window.ipcRenderer.send("badge-icon.increment", {
            reset: true
        });
    }
    await saveSettings();
});

const editShortcut = () => {
    editMode.value = true;

    window.ipcRenderer.send("settings.clear-shortcuts", {});
};

const openThemeGenerator = () => {
    window.ipcRenderer.send("main:openLink", "https://daisyui.com/theme-generator");
};

const saveCustomTheme = async () => {
    settingsStore.settings.custom_css = customTheme.value.replace(/@plugin.*?{([\s\S]*?)}/g, `[data-theme="custom"] { $1 }`);
    settingsStore.settings.theme = "custom";

    await nextTick(async () => {
        await saveSettings();

        window.ipcRenderer.send("reload");
    });
};

const openLaravelDocs = () => {
    window.ipcRenderer.send("main:openLink", "https://laravel.com/docs/context");
};
</script>

<template>
    <div class="overflow-auto text-base-content">
        <dialog
            id="modal_custom_theme"
            class="modal modal-middle"
        >
            <div class="modal-box">
                <h3 class="text-lg font-bold">Custom Theme</h3>
                <fieldset class="fieldset w-full">
                    <legend class="fieldset-legend">Add your custom theme here:</legend>

                    <span
                        @click="openThemeGenerator"
                        class="cursor-pointer link fieldset-label"
                        >https://daisyui.com/theme-generator</span
                    >

                    <textarea
                        class="textarea rounded-lg h-80 w-full"
                        v-model="customTheme"
                    >
                    </textarea>
                </fieldset>
                <div class="modal-action">
                    <form
                        method="dialog"
                        class="flex gap-3"
                    >
                        <button class="btn btn-sm">Close</button>

                        <button
                            @click="saveCustomTheme"
                            type="button"
                            class="btn btn-sm btn-primary"
                        >
                            {{ $t("settings.save") }}
                        </button>
                    </form>
                </div>
            </div>
        </dialog>

        <div class="max-w-2xl mx-auto p-10">
            <div class="tabs tabs-box">
                <input
                    v-model="selected"
                    value="settings"
                    type="radio"
                    name="settings"
                    class="tab"
                    aria-label="Settings"
                />
                <input
                    v-model="selected"
                    value="layout"
                    type="radio"
                    name="layout"
                    class="tab"
                    aria-label="Layout"
                />
                <input
                    v-model="selected"
                    value="limited_dumps"
                    type="radio"
                    name="settings"
                    class="tab"
                    aria-label="Limited Dumps"
                />
                <input
                    v-model="selected"
                    value="shortcuts"
                    type="radio"
                    name="settings"
                    class="tab"
                    aria-label="Shortcuts"
                />
            </div>

            <span
                :class="{ 'opacity-0': !saved, 'opacity-65': saved }"
                class="px-3 text-sm flex justify-end transition-all duration-300"
                >{{ $t("settings.changes_saved") }}</span
            >

            <div
                v-if="selected === 'settings'"
                class="p-4"
            >
                <div class="mt-3 grid grid-cols-2 items-center">
                    <div>App version</div>
                    <div class="text-right">
                        {{ settingsStore.settings.version ?? "-" }}
                    </div>
                </div>

                <Divider class="mt-3" />
                <div class="mt-3 grid grid-cols-2 items-center">
                    <div>{{ $t("settings.language") }}</div>
                    <div class="flex items-center justify-between">
                        <SelectInput
                            id="theme"
                            v-model="settingsStore.settings.language"
                            @change="saveLanguage()"
                            placeholder="Select a language"
                            class="w-full"
                        >
                            <option
                                v-for="(value, key) in settingsStore.languageOptions"
                                :value="key"
                            >
                                {{ value }}
                            </option>
                        </SelectInput>
                    </div>
                </div>

                <Divider class="mt-3" />
                <div class="mt-3 grid grid-cols-2 items-center">
                    <div>IDE Handler</div>
                    <div class="flex items-center justify-between">
                        <SelectInput
                            id="theme"
                            v-model="settingsStore.settings.ide_handler"
                            @change="saveIDEHandler()"
                            placeholder="Select a IDE handler"
                            class="w-full"
                        >
                            <option
                                v-for="(value, key) in settingsStore.ideHandlerOptions"
                                :value="key"
                            >
                                {{ value }}
                            </option>
                        </SelectInput>
                    </div>
                </div>

                <Divider class="mt-3" />
                <div class="mt-3 grid grid-cols-2 items-center">
                    <div>{{ $t("settings.check_for_updates") }}</div>
                    <div class="flex items-center justify-between">
                        <SelectInput
                            id="theme"
                            v-model="settingsStore.settings.check_for_updates"
                            @change="saveCheckForUpdates()"
                            placeholder="Check for Updates"
                            class="w-full"
                        >
                            <option
                                v-for="(value, key) in settingsStore.checkForUpdateOptions"
                                :value="key"
                            >
                                {{ value }}
                            </option>
                        </SelectInput>
                    </div>
                </div>

                <Divider class="mt-3" />
                <div class="mt-3 grid grid-cols-2 items-center">
                    <div>Auto-Launch</div>
                    <div class="flex items-center justify-between">
                        <SelectInput
                            id="theme"
                            v-model="settingsStore.settings.auto_launch"
                            @change="saveAutoLaunch()"
                            placeholder="Auto-Launch"
                            class="w-full"
                        >
                            <option
                                v-for="(value, key) in settingsStore.autoLaunchOptions"
                                :value="key"
                            >
                                {{ value }}
                            </option>
                        </SelectInput>
                    </div>
                </div>
            </div>

            <div
                v-if="selected === 'layout'"
                class="p-4"
            >
                <div class="mt-3 grid grid-cols-2 items-center">
                    <div>Theme</div>
                    <div class="flex items-center justify-between">
                        <SelectInput
                            id="theme"
                            v-model="settingsStore.settings.theme"
                            @change="saveTheme()"
                            placeholder="Select a theme"
                            class="w-full"
                        >
                            <option
                                v-for="(value, key) in settingsStore.themes"
                                :value="key"
                            >
                                {{ value }}
                            </option>
                        </SelectInput>
                    </div>
                </div>

                <Divider class="mt-3" />
                <div class="mt-3 grid grid-cols-2 items-center">
                    <div>Scroll Direction</div>
                    <div class="flex items-center justify-between">
                        <SelectInput
                            id="scroll"
                            v-model="settingsStore.settings.scroll_direction"
                            @change="saveScrollDirection()"
                            placeholder="Scroll Direction"
                            class="w-full"
                        >
                            <option
                                v-for="(value, key) in settingsStore.scrollDirection"
                                :value="key"
                            >
                                {{ value }}
                            </option>
                        </SelectInput>
                    </div>
                </div>

                <Divider class="mt-3" />
                <div class="mt-3 grid grid-cols-2 items-center">
                    <div>Dump Order</div>
                    <div class="flex items-center justify-between">
                        <SelectInput
                            id="scroll"
                            v-model="settingsStore.settings.dump_order"
                            @change="saveReverse()"
                            placeholder="Dump Order"
                            class="w-full"
                        >
                            <option
                                v-for="(value, key) in settingsStore.dumpOrder"
                                :value="key"
                            >
                                {{ value }}
                            </option>
                        </SelectInput>
                    </div>
                </div>

                <Divider class="mt-3" />
                <div class="mt-3 grid grid-cols-2 items-center">
                    <div>
                        Show context (Laravel)
                        <span class="ml-1"
                            ><a
                                class="text-xs opacity-70 link link-info"
                                @click="openLaravelDocs"
                                >Laravel Docs</a
                            ></span
                        >
                    </div>
                    <div class="flex items-center justify-end">
                        <div class="p-1.5">
                            <input
                                type="checkbox"
                                class="toggle toggle-sm toggle-accent"
                                v-model="settingsStore.settings.show_context"
                            />
                        </div>
                    </div>
                </div>

                <Divider class="mt-3" />
                <div class="mt-3 grid grid-cols-2 items-center">
                    <div>Show badge count <span class="text-xs opacity-70">(macOS, linux)</span></div>
                    <div class="flex items-center justify-end">
                        <div class="p-1.5">
                            <input
                                type="checkbox"
                                class="toggle toggle-sm toggle-accent"
                                v-model="settingsStore.settings.show_badge_count"
                            />
                        </div>
                    </div>
                </div>

                <Divider class="mt-3" />
                <div class="mt-3 grid grid-cols-2 items-center">
                    <div>Show Collapse Button</div>
                    <div class="flex items-center justify-end">
                        <div class="p-1.5">
                            <input
                                type="checkbox"
                                class="toggle toggle-sm toggle-accent"
                                v-model="settingsStore.settings.show_collapse_button"
                            />
                        </div>
                    </div>
                </div>

                <Divider class="mt-3" />
                <div class="mt-3 grid grid-cols-2 items-center">
                    <div>Show Pause Button</div>
                    <div class="flex items-center justify-end">
                        <div class="p-1.5">
                            <input
                                type="checkbox"
                                class="toggle toggle-sm toggle-accent"
                                v-model="settingsStore.settings.show_pause_button"
                            />
                        </div>
                    </div>
                </div>

                <Divider class="mt-3" />
                <div class="mt-3 grid grid-cols-2 items-center">
                    <div>Show SSH Button</div>
                    <div class="flex items-center justify-end">
                        <div class="p-1.5">
                            <input
                                type="checkbox"
                                class="toggle toggle-sm toggle-accent"
                                v-model="settingsStore.settings.show_ssh_button"
                            />
                        </div>
                    </div>
                </div>

                <Divider class="mt-3" />
                <div class="mt-3 grid grid-cols-2 items-center">
                    <div>Show variable type</div>
                    <div class="flex items-center justify-end">
                        <div class="p-1.5">
                            <input
                                type="checkbox"
                                class="toggle toggle-sm toggle-accent"
                                v-model="settingsStore.settings.show_variable_type"
                            />
                        </div>
                    </div>
                </div>

                <Divider class="mt-3" />
                <div class="mt-3 grid grid-cols-2 items-center">
                    <div>Show Tips</div>
                    <div class="flex items-center justify-end">
                        <div class="p-1.5">
                            <input
                                type="checkbox"
                                class="toggle toggle-sm toggle-accent"
                                v-model="settingsStore.settings.show_tips"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div
                v-if="selected === 'limited_dumps'"
                class="p-4"
            >
                <div class="mt-3 grid grid-cols-2 items-center">
                    <div>Dumps</div>
                    <div class="flex items-center justify-between">
                        <input
                            type="number"
                            class="grow input input-bordered input-md w-full"
                            v-model="settingsStore.settings.limit_dumps"
                            @change="saveLimitDumps()"
                        />
                    </div>
                </div>

                <Divider class="mt-3" />
                <div class="mt-3 grid grid-cols-2 items-center">
                    <div>Laravel Queries</div>
                    <div class="flex items-center justify-between">
                        <input
                            type="number"
                            class="grow input input-bordered input-md w-full"
                            v-model="settingsStore.settings.limit_laravel_queries"
                            @change="saveLimitDumps()"
                        />
                    </div>
                </div>

                <Divider class="mt-3" />
                <div class="mt-3 grid grid-cols-2 items-center">
                    <div>Laravel Logs</div>
                    <div class="flex items-center justify-between">
                        <input
                            type="number"
                            class="grow input input-bordered input-md w-full"
                            v-model="settingsStore.settings.limit_laravel_logs"
                            @change="saveLimitDumps()"
                        />
                    </div>
                </div>

                <Divider class="mt-3" />
                <div class="mt-3 grid grid-cols-2 items-center">
                    <div>Laravel Jobs</div>
                    <div class="flex items-center justify-between">
                        <input
                            type="number"
                            class="grow input input-bordered input-md w-full"
                            v-model="settingsStore.settings.limit_laravel_jobs"
                            @change="saveLimitDumps()"
                        />
                    </div>
                </div>
            </div>

            <div
                v-if="selected === 'shortcuts'"
                class="p-4"
            >
                <div
                    v-for="(shortcut, key) in settingsStore.settings.shortcuts"
                    :key="key"
                    class="mt-3 grid grid-cols-2 items-center"
                >
                    <div>{{ $t(shortcut.label) }}</div>
                    <div class="flex items-center justify-between">
                        <input
                            type="text"
                            :disabled="!editMode"
                            readonly
                            :placeholder="editMode ? 'type here ...' : ''"
                            :name="key"
                            :data-label="shortcut.label"
                            :id="key"
                            class="js-shortcut disabled:text-base-content/80 grow input input-bordered input-md w-full"
                            :value="shortcut.originalValue"
                        />
                    </div>
                </div>

                <div class="mt-4 flex gap-2 justify-end">
                    <button
                        @click="editShortcut"
                        type="button"
                        class="btn btn-sm btn-ghost"
                    >
                        {{ $t("settings.edit") }}
                    </button>

                    <button
                        @click="saveShortcuts"
                        type="button"
                        class="btn btn-sm btn-primary"
                    >
                        {{ $t("settings.save") }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>
