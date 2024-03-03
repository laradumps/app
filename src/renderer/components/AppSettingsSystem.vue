<script setup lang="ts">
import { useI18n } from "vue-i18n";

const i18n = useI18n();

const clearAllSettings = (): void => {
    window.ipcRenderer.on("main:dialog-choice", (event, arg) => {
        if (arg === 0) {
            window.ipcRenderer.send("main:settings-clear-all-settings");

            alert(i18n.t("settings.deleted_message"));
            location.reload();
        }
    });

    window.ipcRenderer.send("main:dialog", {
        buttons: [i18n.t("yes"), i18n.t("no")],
        title: i18n.t("settings.clear_all_settings"),
        message: i18n.t("settings.clear_all_settings_dialog_message")
    });
};
</script>

<template>
    <div class="space-y-5">
        <div>
            <div class="mt-40 text-sm space-y-3">
                <div class="text-lg text-left mt-4 font-normal text-base-700">
                    {{ $t("settings.reset_data") }}
                </div>
                <p>{{ $t("settings.reset_data_description") }}</p>
            </div>
            <div class="flex justify-center mt-6">
                <button
                    @click="clearAllSettings"
                    type="button"
                    class="btn btn-danger"
                >
                    {{ $t("settings.clear_all_settings") }}
                </button>
            </div>
        </div>
    </div>
</template>
