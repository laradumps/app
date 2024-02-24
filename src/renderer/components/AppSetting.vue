<template>
    <div>
        <div class="flex justify-between items-center px-3 py-1 bg-base-100 shadow text-center z-100">
            <nav class="flex">
                <a
                    @click="toggleSetting"
                    class="justify-center cursor-pointer text-base-500 group flex items-center p-2"
                >
                    <ArrowLeftIcon class="w-5 text-base hover:opacity-75" />
                </a>
            </nav>
        </div>

        <div class="p-4">
            <div
                role="tablist"
                class="tabs tabs-boxed"
            >
                <a
                    @click="selectedPage = 'Environment'"
                    role="tab"
                    :class="{ 'tab-active': selectedPage === 'Environment' }"
                    class="tab"
                >{{ $t("settings.environment") }}</a
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
                <div class="flex justify-between items-end border-b border-base-200">
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
                <AppSettingsEnvironment v-if="selectedPage === 'Environment'" />

                <AppSettingsLocalShortcuts
                    :local-shortcut-list="localShortcutList"
                    v-if="selectedPage === 'Shortcuts'"
                />

                <AppSettingsSystem v-if="selectedPage === 'System'" />
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed, ref } from "vue";

import AppSettingsLocalShortcuts from "@/components/AppSettingsLocalShortcuts.vue";
import AppSettingsEnvironment from "@/components/AppSettingsEnvironment.vue";
import AppSettingsSystem from "@/components/AppSettingsSystem.vue";
import { ArrowLeftIcon } from "@heroicons/vue/24/outline";
import { useSettingStore } from "@/store/setting";

const selectedPage = ref("Environment");
const settingStore = useSettingStore();

const hasUpdates = computed(() => {
    return localStorage.updateAvailable === "true";
});

const checkUpdates = computed(() => {
    window.ipcRenderer.send("main:check-upload");
});

const toggleSetting = () => {
    settingStore.toggle()
}

defineProps({
    localShortcutList: {
        required: true,
        type: Array
    }
});
</script>
