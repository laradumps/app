<template>
    <div class="px-6 py-3">
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
</template>

<script setup>
import { computed, ref } from "vue";

import AppSettingsLocalShortcuts from "@/components/AppSettingsLocalShortcuts.vue";
import AppSettingsEnvironment from "@/components/AppSettingsEnvironment.vue";
import AppSettingsSystem from "@/components/AppSettingsSystem.vue";

const selectedPage = ref("Environment");
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
