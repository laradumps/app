<script setup lang="ts">
import Divider from "../components/Divider.vue";
import { nextTick, onMounted, ref } from "vue";
import { useSettingsStore } from "@/store/settings";
import SelectInput from "@/components/SelectInput.vue";
import { useI18n } from "vue-i18n";
import { useI18nStore } from "@/store/i18n";
import { useIDEHandlerStore } from "@/store/ide-handler";
import hotkeys from "hotkeys-js";

const editMode = ref("disabled");
const saved = ref(false);
const settingsStore = useSettingsStore();
const IDEHandler = useIDEHandlerStore();

const i18n = useI18n();
const { locale } = useI18n({ useScope: "global" });
const localeStore = useI18nStore();

onMounted(() => {
    getSavedLocalShortcuts();
    detectHotKeysPress();
});

const saveSettings = async () => {
    saved.value = true;
    await settingsStore.update();
    setTimeout(() => {
        saved.value = false;
    }, 2000);
};

const saveTheme = () => {
    document.documentElement.setAttribute("data-theme", settingsStore.settings.theme);
    nextTick(() => saveSettings());
};

const saveLanguage = () => {
    localeStore.set(settingsStore.settings.language);
    locale.value = localeStore.value;

    nextTick(() => saveSettings());
};

const saveIDEHandler = () => {
    IDEHandler.setValue(settingsStore.settings.ide_handler);

    nextTick(() => saveSettings());
};

const saveCheckForUpdates = () => {
    nextTick(() => saveSettings());
};

const saveAutoLaunch = () => {
    window.ipcRenderer.send("set-auto-launch", { value: settingsStore.settings.auto_launch });

    nextTick(() => saveSettings());
};

const saveScrollDirection = () => {
    nextTick(() => saveSettings());
}

const saveReverse = () => {
    nextTick(() => saveSettings());
}

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

            console.log(element.name);
            window.ipcRenderer.send("local-shortcut:set", shortcut);
        }
    });

    await saveSettings();

    window.ipcRenderer.send("settings.init-shortcuts");

    alert(i18n.t("settings.shortcut.save_message"));

    editMode.value = "disabled";
};

const editShortcut = () => {
    editMode.value = "";

    window.ipcRenderer.send("local-shortcut:reset", {});
};
</script>

<template>
    <div class="overflow-auto text-base-content">
        <div class="max-w-lg mx-auto p-10">
            <div class="flex items-center justify-between">
                <h1 class="text-lg font-semibold">{{ $t("settings.settings") }}</h1>
                <span
                    :class="{ 'opacity-0': !saved, 'opacity-65': saved }"
                    class="transition-all duration-300"
                    >{{ $t("settings.changes_saved") }}</span
                >
            </div>
            <Divider class="mt-3" />
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

            <div class="mt-10 flex items-center justify-between">
                <h1 class="text-lg font-semibold">{{ $t("settings.shortcuts") }}</h1>
            </div>

            <Divider class="mt-3" />
            <div
                v-for="(shortcut, key) in settingsStore.settings.shortcuts"
                :key="key"
                class="mt-3 grid grid-cols-2 items-center"
            >
                <div>{{ $t(shortcut.label) }}</div>
                <div class="flex items-center justify-between">
                    <input
                        type="text"
                        readonly
                        :placeholder="editMode !== 'disabled' ? 'type here ...' : ''"
                        :disabled="editMode === 'disabled'"
                        :name="key"
                        :data-label="shortcut.label"
                        :id="key"
                        class="js-shortcut grow input input-bordered input-sm w-full"
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
</template>
