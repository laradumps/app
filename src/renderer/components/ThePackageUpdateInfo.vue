<script setup lang="ts">
import { ClipboardIcon } from "@heroicons/vue/24/outline";
import { ref } from "vue";

const updateInfo = ref({});
const modal = ref(null)

window.ipcRenderer.on("ipc:package-down", (event, arg) => {
    updateInfo.value = arg
    setTimeout(() => modal.value.showModal(), 0)
});

function formatVersion(version: string) {
    if (typeof version == "undefined") {
        return;
    }

    const versionString = version.toString().padStart(4, "0");
    const major = versionString.slice(0, 1);
    const minor = versionString.slice(1, 3).replace(/^0+/, '');
    const patch = versionString.slice(3);

    return `^${major}.${minor}.${patch}`;
}
</script>

<template>
    <div class="text-sm space-y-3 text-base-content">
        <dialog ref="modal" class="modal">
            <div class="modal-box w-11/12 max-w-5xl">
                <div class="font-bold text-lg text-center">✨ {{ $t("package_update_info.lara_dumps_package_update_available") }}</div>
                <p class="py-4">
                    <br />
                    <p>{{ $t("package_update_info.there_is_a_new_release_of_lara_dumps_laravel_package") }}</p>
                    <br />
                    <p>
                        <span class="font-semibold">{{ $t("package_update_info.to_upgrade_lara_dumps_in_your_project_run") }}</span>
                    </p>
                    <div class="mt-5">
                        <strong>Laravel:</strong>
                        <span class="p-1.5 bg-base-200 text-md rounded mr-1 cursor-pointer leading-normal">
                            <button
                                :title="$t('click_to_copy')"
                                @click="$clipboard('composer require laradumps/laradumps ^3.0 -W', 'copyComposerIcon')"
                            >
                                <div class="flex justify-between gap-2">
                                    <span>composer require laradumps/laradumps ^3.0 --dev -W</span>
                                    <div title="Click to copy">
                                        <ClipboardIcon class="w-5 h-5 text-base-700 hover:text-base-800" />
                                    </div>
                                </div>
                            </button>
                        </span>
                    </div>

                    <div class="mt-3">
                        <strong>Core:</strong>
                        <span class="p-1.5 bg-base-200 text-md rounded cursor-pointer leading-normal">
                            <button
                                :title="$t('click_to_copy')"
                                @click="$clipboard('composer require laradumps/laradumps ^3.0 --dev -W', 'copyComposerIcon')"
                            >
                                <div class="flex justify-between gap-2">
                                    <span>composer require laradumps/laradumps-core ^2.0 --dev -W</span>
                                    <div title="Click to copy">
                                        <ClipboardIcon class="w-5 h-5 text-base-700hover:text-base-800" />
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
                                v-text="formatVersion(updateInfo.packageVersion)"
                            ></span>
                        </p>
                        <p>
                            {{ $t("package_update_info.minimum_required_version") }}
                            <span
                                class="font-semibold"
                                v-text="formatVersion(updateInfo.minPackageVersion)"
                            ></span>
                        </p>
                    </div>
                    <div class="mt-5">
                        <p>{{ $t("package_update_info.for_more_information_visit") }}</p>
                        <div
                            class="mt-2 cursor-pointer font-semibold"
                            @click="openLink('https://github.com/laradumps/laradumps')"
                        >
                            https://laradumps.dev
                        </div>
                    </div>
                </p>
                <div class="modal-action">
                    <form method="dialog">
                        <button class="btn">Ok</button>
                    </form>
                </div>
            </div>
        </dialog>
    </div>
</template>
