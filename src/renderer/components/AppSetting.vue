<script setup>
import { computed, ref } from "vue";

import AppSettingsLocalShortcuts from "@/components/AppSettingsLocalShortcuts.vue";
import AppSettingsSystem from "@/components/AppSettingsSystem.vue";
import { ArrowLeftIcon } from "@heroicons/vue/24/outline";
import { useSettingStore } from "@/store/setting";

const selectedPage = ref("Shortcuts");

const hasUpdates = computed(() => {
    return localStorage.updateAvailable === "true";
});

const checkUpdates = computed(() => {
    window.ipcRenderer.send("main:check-upload");
});

defineProps({
    localShortcutList: {
        required: true,
        type: Array
    }
});
</script>
<template>
    <div class="flex flex-col">
        <div class="flex h-[38px] justify-end items-center text-center z-100">
            <div class="select-none w-full nav-bar text-[11px] uppercase font-medium tracking-wide">Settings</div>
        </div>

        <div class="px-4">
            <div
                role="tablist"
                class="tabs tabs-boxed my-4"
            >
                <a
                    @click="selectedPage = 'Shortcuts'"
                    role="tab"
                    class="tab"
                    :class="{ 'tab-active': selectedPage === 'Shortcuts' }"
                    >{{ $t("settings.shortcuts") }}</a
                >
                <a
                    @click="selectedPage = 'System'"
                    role="tab"
                    class="tab"
                    :class="{ 'tab-active': selectedPage === 'System' }"
                    >{{ $t("settings.system") }}</a
                >
            </div>

            <div>
                <div class="flex justify-between items-end">
                    <div v-show="hasUpdates">
                        <button
                            type="button"
                            @click="checkUpdates"
                            class="btn-updates !text-[0.70rem]"
                        >
                            {{ $t("settings.update_available") }}
                        </button>
                    </div>
                </div>
            </div>

            <div class="py-4">
                <AppSettingsLocalShortcuts
                    :local-shortcut-list="localShortcutList"
                    v-if="selectedPage === 'Shortcuts'"
                />

                <AppSettingsSystem v-if="selectedPage === 'System'" />
            </div>
        </div>
    </div>
</template>
