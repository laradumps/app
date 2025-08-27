<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from "vue";
import { UpdateInfo } from "electron-updater";
import { CompletedInfo, DownloadInfo } from "@/types/Updater";
import moment from "moment";
import IconDownload from "@/components/Icons/IconDownload.vue";
import { useSettingsStore } from "@/store/settings";

const settingsStore = useSettingsStore();

const updateInfo = ref<Partial<UpdateInfo>>({});
const progress = ref<number>(0);
const loading = ref(false);
const downloading = ref(false);
const releaseNotes = ref<HTMLElement | null>(null);

const progressPercentage = computed(() => Math.round(progress.value * 100));

const install = (): void => {
    downloading.value = true;
    window.ipcRenderer.send("main:download-update");
};

const sanitizeReleaseNotes = async (): Promise<void> => {
    await nextTick();

    if (!releaseNotes.value) return;

    releaseNotes.value.replaceWith(releaseNotes.value.cloneNode(true));
    releaseNotes.value = document.getElementById("release-notes") as HTMLElement;

    releaseNotes.value?.querySelectorAll("a").forEach((anchor) => {
        const text = document.createTextNode(anchor.textContent || "");
        anchor.replaceWith(text);
    });
};

const onUpdateAvailable = (_: any, arg: UpdateInfo) => {
    updateInfo.value = arg;
    settingsStore.setUpdateAvailable(arg?.version);
    sanitizeReleaseNotes();
};

const onUpdateInfo = (_: any, args: UpdateInfo): void => {
    if (settingsStore.settings.check_for_updates === "manual_download") return;

    const baseURL = "https://github.com/laradumps/app/releases/download/";
    const tag = args.tag;
    const files = args.files;

    const dmgFile = files.find((file) => file.url.includes("dmg"));
    if (!dmgFile) return;

    const downloadURL = `${baseURL}${tag}/${dmgFile.url}`;

    loading.value = true;
    window.ipcRenderer.send("main:download-progress-info", downloadURL);
};

const onDownloadProgress = (_: any, args: DownloadInfo): void => {
    progress.value = args.percent;
};

const onDownloadComplete = (_: any, args: CompletedInfo): void => {
    window.ipcRenderer.send("main:download-complete", args.path);
    loading.value = false;
};

onMounted(() => {
    window.ipcRenderer.on("update-available", onUpdateAvailable);
    window.ipcRenderer.on("autoUpdater:update-info", onUpdateInfo);
    window.ipcRenderer.on("autoUpdater:download-progress", onDownloadProgress);
    window.ipcRenderer.on("autoUpdater:download-complete", onDownloadComplete);
});

onUnmounted(() => {
    window.ipcRenderer.removeListener("update-available", onUpdateAvailable);
    window.ipcRenderer.removeListener("autoUpdater:update-info", onUpdateInfo);
    window.ipcRenderer.removeListener("autoUpdater:download-progress", onDownloadProgress);
    window.ipcRenderer.removeListener("autoUpdater:download-complete", onDownloadComplete);
});
</script>

<template>
    <div class="text-sm space-y-3 text-base-content">
        <dialog
            id="update_modal"
            class="modal"
        >
            <div class="modal-box w-11/12 max-w-5xl">
                <div class="font-bold text-lg text-center">✨ {{ $t("app_update_info.update_available") }}</div>

                <div class="mt-2 space-y-3">
                    <div class="card card-side bg-neutral shadow-xl">
                        <div class="select-none space-y-3 card-body text-neutral-content/80">
                            <div class="flex justify-between">
                                <div>
                                    <h2 class="card-title">{{ $t("app_update_info.version") }}</h2>
                                    <p>{{ updateInfo.version }}</p>
                                </div>
                                <div>
                                    <h2 class="card-title">{{ $t("app_update_info.release_date") }}</h2>
                                    <p>{{ moment(updateInfo.releaseDate).format("MMM Do YY") }}</p>
                                </div>
                            </div>

                            <div
                                ref="releaseNotes"
                                id="release-notes"
                                v-html="updateInfo.releaseNotes"
                            />
                        </div>
                    </div>

                    <div class="h-[8px]">
                        <div
                            v-show="loading"
                            class="bg-accent progress rounded-full"
                            :style="{ width: progressPercentage + '%' }"
                        />
                    </div>
                </div>

                <div class="modal-action">
                    <form method="dialog">
                        <button
                            class="btn btn-secondary"
                            :disabled="downloading"
                        >
                            {{ $t("app_update_info.not_now") }}
                        </button>
                    </form>
                    <button
                        class="btn btn-primary"
                        :disabled="downloading"
                        @click="install"
                    >
                        <IconDownload class="w-5" />
                        {{ $t("app_update_info.install") }}
                    </button>
                </div>
            </div>
        </dialog>
    </div>
</template>

<style>
@reference "./../../styles.css";

#release-notes h2 {
    font-size: 1.125rem !important;
    line-height: 1.75rem !important;
    font-weight: 600 !important;
}

#release-notes ul {
    list-style: disc !important;
    margin-left: 36px !important;
    padding: 4px;
    @apply space-y-1.5 my-1.5;
}
</style>
