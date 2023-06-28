<template>
    <div class="space-y-6 sm:space-y-5">
        <div
            v-for="shortcut in shortcuts"
            :key="shortcut.alias"
        >
            <label class="block text-sm font-normal leading-6 text-slate-900 dark:text-slate-400">
                {{ $t(shortcut.label) }}
            </label>
            <div class="flex rounded-md shadow-sm border border-slate-300 dark:border-slate-800">
                <input
                    type="text"
                    :placeholder="editMode !== 'disabled' ? 'type here ...' : ''"
                    :disabled="editMode === 'disabled'"
                    readonly
                    :name="shortcut.alias"
                    :data-label="shortcut.label"
                    :id="shortcut.alias"
                    class="js-shortcut input"
                />
            </div>
        </div>

        <div class="flex gap-2 justify-end">
            <button
                @click="editShortcut"
                type="button"
                class="btn-rounded-dark"
            >
                {{ $t("settings.edit") }}
            </button>

            <button
                @click="save"
                class="btn-rounded-sky"
            >
                {{ $t("settings.save") }}
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import hotkeys from "hotkeys-js";
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

const i18n = useI18n();

const editMode = ref("disabled");

const shortcuts = ref([
    {
        label: "settings.shortcut.clear",
        alias: "clearAll"
    },
    {
        label: "settings.shortcut.darkMode",
        alias: "darkMode"
    },
    {
        label: "settings.shortcut.alwaysOnTop",
        alias: "alwaysOnTop"
    },
    {
        label: "settings.shortcut.globalSearch",
        alias: "globalSearch"
    },
    {
        label: "settings.shortcut.toggleMenu",
        alias: "toggleMenu"
    }
]);

onMounted(() => {
    getSavedGlobalShortcuts();
    detectHotKeysPress();
});

const getSavedGlobalShortcuts = () => {
    window.ipcRenderer.send("global-shortcut:get");

    window.ipcRenderer.on("app:global-shortcut::list", (arg, shortcuts) => {
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

const editShortcut = () => {
    editMode.value = "";

    window.ipcRenderer.send("global-shortcut:reset", {});
};

const save = () => {
    document.querySelectorAll(".js-shortcut").forEach((element) => {
        if (element.value.toString() !== "") {
            window.ipcRenderer.send("global-shortcut:set", {
                alias: element.name,
                label: element.dataset.label,
                shortcut: `ds_shortcut_${element.name}`,
                originalValue: element.value,
                keys: element.value.toElectronFormat()
            });
        }
    });

    alert(i18n.t("settings.shortcut.save_message"));

    editMode.value = "disabled";
};
</script>
