<template>
    <div class="text-sm space-y-3">
        <div class="font-semibold text-lg">✨ {{ $t("package_update_info.lara_dumps_package_update_available") }}</div>
        <div class="text-left px-5">
            <p class="text-base font-semibold">{{ $t("package_update_info.hey_dev") }}</p>
            <br />
            <p>{{ $t("package_update_info.there_is_a_new_release_of_lara_dumps_laravel_package") }}</p>
            <br />
            <p>{{ $t("package_update_info.consider_upgrading_to_enjoy_the_benefits_of_new_features_bug_fixes_and_improvements") }}</p>
            <br />
            <p>
                <span class="font-semibold">{{ $t("package_update_info.to_upgrade_lara_dumps_in_your_project_run") }}</span>
            </p>
            <div class="mt-5">
                <span class="p-1.5 bg-slate-200 text-md rounded mr-1 cursor-pointer leading-normal">
                    <button
                        :title="$t('click_to_copy')"
                        @click="$clipboard('composer upgrade laradumps/laradumps', 'copyComposerIcon')"
                    >
                        <div class="flex justify-between dark:text-slate-700">
                            <span>composer upgrade laradumps/laradumps</span>
                            <div title="Click to copy">
                                <ClipboardIcon class="w-5 h-5 text-slate-700 dark:text-slate-400 hover:text-slate-800 dark:hover:text-yellow-400" />
                            </div>
                        </div>
                    </button>
                </span>
            </div>
            <div class="mt-5">
                <p>
                    {{ $t("package_update_info.installed_version") }}
                    <span
                        class="font-semibold"
                        v-text="updateInfo.packageVersion"
                    ></span>
                </p>
                <p>
                    {{ $t("package_update_info.minimum_required_version") }}
                    <span
                        class="font-semibold"
                        v-text="updateInfo.minPackageVersion"
                    ></span>
                </p>
            </div>
            <div class="mt-5">
                <p>{{ $t("package_update_info.for_more_information_visit") }}</p>
                <div
                    class="mt-2 cursor-pointer font-semibold"
                    @click="openLink('https://github.com/laradumps/laradumps')"
                >
                    https://github.com/laradumps/laradumps
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ClipboardIcon } from "@heroicons/vue/24/outline";

defineProps({
    updateInfo: {
        type: Object
    }
});

const openLink = (link) => window.ipcRenderer.send("main:openLink", link);
</script>
