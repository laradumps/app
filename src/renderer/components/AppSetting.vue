<template>
    <div class="px-6 py-3">
        <div>
            <div class="border-b border-slate-200 dark:border-slate-700">
                <nav
                    class="-mb-px flex space-x-8 cursor-pointer"
                    aria-label="Tabs"
                >
                    <a
                        @click="selectedPage = 'Environment'"
                        :class="{ '!border-slate-900 text-slate-600 dark:text-slate-400 dark:!border-slate-400': selectedPage === 'Environment' }"
                        class="border-transparent text-slate-500 hover:border-slate-300 dark:hover:text-slate-300 hover:text-slate-700 whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium"
                    >
                        {{ $t("settings.environment") }}
                    </a>

                    <a
                        @click="selectedPage = 'Shortcuts'"
                        :class="{ '!border-slate-900 text-slate-600 dark:text-slate-400 dark:!border-slate-400': selectedPage === 'Shortcuts' }"
                        class="border-transparent text-slate-500 hover:border-slate-300 dark:hover:text-slate-300 hover:text-slate-700 whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium"
                    >
                        {{ $t("settings.shortcuts") }}
                    </a>

                    <a
                        @click="selectedPage = 'Language'"
                        :class="{ '!border-slate-900 text-slate-600 dark:text-slate-400 dark:!border-slate-400': selectedPage === 'Language' }"
                        class="border-transparent text-slate-500 hover:border-slate-300 dark:hover:text-slate-300 hover:text-slate-700 whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium"
                        aria-current="page"
                    >
                        {{ $t("settings.language") }}
                    </a>
                </nav>
            </div>
        </div>

        <div class="py-4">
            <AppSettingsEnvironment v-show="selectedPage === 'Environment'" />

            <AppSettingsGlobalShortcuts
                :global-shortcut-list="globalShortcutList"
                v-show="selectedPage === 'Shortcuts'"
            />

            <AppSettingsLanguage v-show="selectedPage === 'Language'" />
        </div>
    </div>
</template>

<script setup>
import { ref } from "vue";

import AppSettingsGlobalShortcuts from "@/components/AppSettingsGlobalShortcuts.vue";
import AppSettingsLanguage from "@/components/AppSettingsLanguage.vue";
import AppSettingsEnvironment from "@/components/AppSettingsEnvironment.vue";

const selectedPage = ref("Environment");

defineProps({
    globalShortcutList: {
        required: true,
        type: Array
    }
});
</script>
