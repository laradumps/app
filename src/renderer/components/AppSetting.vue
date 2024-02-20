<template>
    <div class="px-6 py-3">
        <div>
            <div class="flex justify-between items-end border-b border-primary-200 dark:border-primary-700">
                <nav
                    class="-mb-px flex space-x-8"
                    aria-label="Tabs"
                >
                    <a
                        @click="selectedPage = 'Environment'"
                        :class="{ '!border-primary-900 text-primary-600 dark:text-primary-400 dark:!border-primary-400': selectedPage === 'Environment' }"
                        class="cursor-pointer border-transparent text-primary-500 hover:border-primary-300 dark:hover:text-primary-300 hover:text-primary-700 whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium"
                    >
                        {{ $t("settings.environment") }}
                    </a>

                    <a
                        @click="selectedPage = 'Shortcuts'"
                        :class="{ '!border-primary-900 text-primary-600 dark:text-primary-400 dark:!border-primary-400': selectedPage === 'Shortcuts' }"
                        class="cursor-pointer border-transparent text-primary-500 hover:border-primary-300 dark:hover:text-primary-300 hover:text-primary-700 whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium"
                    >
                        {{ $t("settings.shortcuts") }}
                    </a>

                    <a
                        @click="selectedPage = 'System'"
                        :class="{ '!border-primary-900 text-primary-600 dark:text-primary-400 dark:!border-primary-400': selectedPage === 'System' }"
                        class="cursor-pointer border-transparent text-primary-500 hover:border-primary-300 dark:hover:text-primary-300 hover:text-primary-700 whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium"
                        aria-current="page"
                    >
                        {{ $t("settings.system") }}
                    </a>
                </nav>

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
