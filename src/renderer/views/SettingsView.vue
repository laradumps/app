<script setup lang="ts">
import Divider from "@/components/common/Divider.vue";
import { nextTick, onMounted, onUpdated, ref, watch } from "vue";
import { useSettingsStore } from "@/store/settings";
import SelectInput from "@/components/common/SelectInput.vue";
import { useI18n } from "vue-i18n";
import { useI18nStore } from "@/store/i18n";
import hotkeys from "hotkeys-js";
import { useToastStore } from "@/store/toast";
import { Cog6ToothIcon, RectangleGroupIcon, Bars3Icon, KeyIcon } from "@heroicons/vue/24/outline";

const editMode = ref(false);
const selected = ref<string | null>("settings");
const customTheme = ref("");

const settingsStore = useSettingsStore();
const toast = useToastStore();

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
    await settingsStore.update();

    toast.show(i18n.t("settings.changes_saved"), "success");
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
                <h3 class="text-lg font-bold">{{ $t("settings.custom_theme") }}</h3>
                <fieldset class="fieldset w-full">
                    <legend class="fieldset-legend">{{ $t("settings.custom_theme_message") }}</legend>

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
                        <button class="btn btn-sm">{{ $t("settings.close") }}</button>

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

        <div class="mx-auto p-3 pr-5 text-sm">
            <div class="flex gap-3">
                <ul class="menu menu-md bg-base-200 w-40 rounded-box">
                    <li>
                        <span
                            @click="selected = 'settings'"
                            :class="{ 'menu-active': selected === 'settings' }"
                            class="whitespace-nowrap flex items-center gap-2"
                        >
                            <Cog6ToothIcon class="w-4 h-4" />
                            <span>{{ $t("settings.settings") }}</span>
                        </span>
                    </li>
                    <li>
                        <span
                            @click="selected = 'appearance'"
                            :class="{ 'menu-active': selected === 'appearance' }"
                            class="whitespace-nowrap flex items-center gap-2"
                        >
                            <RectangleGroupIcon class="w-4 h-4" />
                            <span>{{ $t("settings.appearance") }}</span>
                        </span>
                    </li>
                    <li>
                        <span
                            @click="selected = 'limited_dumps'"
                            :class="{ 'menu-active': selected === 'limited_dumps' }"
                            class="whitespace-nowrap flex items-center gap-2"
                        >
                            <Bars3Icon class="w-4 h-4" />
                            <span>{{ $t("settings.limited_dumps") }}</span>
                        </span>
                    </li>
                    <li>
                        <span
                            @click="selected = 'shortcuts'"
                            :class="{ 'menu-active': selected === 'shortcuts' }"
                            class="whitespace-nowrap flex items-center gap-2"
                        >
                            <KeyIcon class="w-4 h-4" />
                            <span>{{ $t("settings.shortcuts") }}</span>
                        </span>
                    </li>
                </ul>

                <div class="flex-1 min-h-0">
                    <div
                        v-if="selected === 'settings'"
                        class="overflow-auto"
                    >
                        <div class="mt-2 grid grid-cols-2 items-center">
                            <div>{{ $t("settings.app_version") }}</div>
                            <div class="text-right">
                                {{ settingsStore.settings.version ?? "-" }}
                            </div>
                        </div>

                        <Divider class="mt-2" />
                        <div class="mt-2 grid grid-cols-2 items-center">
                            <div>{{ $t("settings.language") }}</div>
                            <div class="flex items-center justify-between">
                                <SelectInput
                                    id="theme"
                                    v-model="settingsStore.settings.language"
                                    @change="saveLanguage()"
                                    :placeholder="$t('settings.select_language')"
                                    class="w-full select-sm"
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

                        <Divider class="mt-2" />
                        <div class="mt-2 grid grid-cols-2 items-center">
                            <div>{{ $t("settings.ide_handler") }}</div>
                            <div class="flex items-center justify-between">
                                <SelectInput
                                    id="theme"
                                    v-model="settingsStore.settings.ide_handler"
                                    @change="saveIDEHandler()"
                                    :placeholder="$t('settings.select_ide_handler')"
                                    class="w-full select-sm"
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

                        <Divider class="mt-2" />
                        <div class="mt-2 grid grid-cols-2 items-center">
                            <div>{{ $t("settings.check_for_updates") }}</div>
                            <div class="flex items-center justify-between">
                                <SelectInput
                                    id="theme"
                                    v-model="settingsStore.settings.check_for_updates"
                                    @change="saveCheckForUpdates()"
                                    :placeholder="$t('settings.check_for_updates')"
                                    class="w-full select-sm"
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

                        <Divider class="mt-2" />
                        <div class="mt-2 grid grid-cols-2 items-center">
                            <div>{{ $t("settings.auto_launch") }}</div>
                            <div class="flex items-center justify-between">
                                <SelectInput
                                    id="theme"
                                    v-model="settingsStore.settings.auto_launch"
                                    @change="saveAutoLaunch()"
                                    :placeholder="$t('settings.auto_launch')"
                                    class="w-full select-sm"
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
                        v-if="selected === 'appearance'"
                        class="overflow-auto"
                    >
                        <div class="mt-2 grid grid-cols-2 items-center">
                            <div>{{ $t("settings.theme") }}</div>
                            <div class="flex items-center justify-between">
                                <SelectInput
                                    id="theme"
                                    v-model="settingsStore.settings.theme"
                                    @change="saveTheme()"
                                    :placeholder="$t('settings.select_theme')"
                                    class="w-full select-sm"
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

                        <Divider class="mt-2" />
                        <div class="mt-2 grid grid-cols-2 items-center">
                            <div>{{ $t("settings.scroll_direction") }}</div>
                            <div class="flex items-center justify-between">
                                <SelectInput
                                    id="scroll"
                                    v-model="settingsStore.settings.scroll_direction"
                                    @change="saveScrollDirection()"
                                    :placeholder="$t('settings.scroll_direction')"
                                    class="w-full select-sm"
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

                        <Divider class="mt-2" />
                        <div class="mt-2 grid grid-cols-2 items-center">
                            <div>{{ $t("settings.dump_order") }}</div>
                            <div class="flex items-center justify-between">
                                <SelectInput
                                    id="scroll"
                                    v-model="settingsStore.settings.dump_order"
                                    @change="saveReverse()"
                                    :placeholder="$t('settings.dump_order')"
                                    class="w-full select-sm"
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

                        <Divider class="mt-2" />
                        <div class="mt-2 grid grid-cols-2 items-center">
                            <div>
                                {{ $t("settings.show_context") }}
                                <span class="ml-1"
                                    ><a
                                        class="text-xs opacity-70 link link-info"
                                        @click="openLaravelDocs"
                                        >{{ $t("settings.laravel_docs") }}</a
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

                        <Divider class="mt-2" />
                        <div class="mt-2 grid grid-cols-2 items-center">
                            <div>{{ $t("settings.show_badge_count") }}</div>
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

                        <Divider class="mt-2" />
                        <div class="mt-2 grid grid-cols-2 items-center">
                            <div>{{ $t("settings.show_collapse_button") }}</div>
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

                        <Divider class="mt-2" />
                        <div class="mt-2 grid grid-cols-2 items-center">
                            <div>{{ $t("settings.show_pause_button") }}</div>
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

                        <Divider class="mt-2" />
                        <div class="mt-2 grid grid-cols-2 items-center">
                            <div>{{ $t("settings.show_ssh_button") }}</div>
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

                        <Divider class="mt-2" />
                        <div class="mt-2 grid grid-cols-2 items-center">
                            <div>{{ $t("settings.show_variable_type") }}</div>
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

                        <Divider class="mt-2" />
                        <div class="mt-2 grid grid-cols-2 items-center">
                            <div>{{ $t("settings.show_tips") }}</div>
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
                        class="overflow-auto"
                    >
                        <div class="mt-2 grid grid-cols-2 items-center">
                            <div>{{ $t("settings.dumps") }}</div>
                            <div class="flex items-center justify-between">
                                <input
                                    type="number"
                                    class="input input-bordered input-sm w-full"
                                    v-model="settingsStore.settings.limit_dumps"
                                    @change="saveLimitDumps()"
                                />
                            </div>
                        </div>

                        <Divider class="mt-2" />
                        <div class="mt-2 grid grid-cols-2 items-center">
                            <div>{{ $t("settings.laravel_queries") }}</div>
                            <div class="flex items-center justify-between">
                                <input
                                    type="number"
                                    class="input input-bordered input-sm w-full"
                                    v-model="settingsStore.settings.limit_laravel_queries"
                                    @change="saveLimitDumps()"
                                />
                            </div>
                        </div>

                        <Divider class="mt-2" />
                        <div class="mt-2 grid grid-cols-2 items-center">
                            <div>{{ $t("settings.laravel_logs") }}</div>
                            <div class="flex items-center justify-between">
                                <input
                                    type="number"
                                    class="input input-bordered input-sm w-full"
                                    v-model="settingsStore.settings.limit_laravel_logs"
                                    @change="saveLimitDumps()"
                                />
                            </div>
                        </div>

                        <Divider class="mt-2" />
                        <div class="mt-2 grid grid-cols-2 items-center">
                            <div>{{ $t("settings.laravel_jobs") }}</div>
                            <div class="flex items-center justify-between">
                                <input
                                    type="number"
                                    class="input input-bordered input-sm w-full"
                                    v-model="settingsStore.settings.limit_laravel_jobs"
                                    @change="saveLimitDumps()"
                                />
                            </div>
                        </div>
                    </div>

                    <div
                        v-if="selected === 'shortcuts'"
                        class="overflow-auto"
                    >
                        <div
                            v-for="(shortcut, key) in settingsStore.settings.shortcuts"
                            :key="key"
                            class="mt-2 grid grid-cols-2 items-center"
                        >
                            <div>{{ $t(shortcut.label) }}</div>
                            <div class="flex items-center justify-between">
                                <input
                                    type="text"
                                    :disabled="!editMode"
                                    readonly
                                    :placeholder="editMode ? $t('settings.shortcut_placeholder') : ''"
                                    :name="key"
                                    :data-label="shortcut.label"
                                    :id="key"
                                    class="js-shortcut disabled:text-base-content/80 input input-bordered input-sm w-full"
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
        </div>
    </div>
</template>
