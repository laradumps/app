<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { UpdateInfo } from "electron-updater";
import { CompletedInfo, DownloadInfo } from "@/types/Updater";
import moment from "moment";
import IconDownload from "@/components/Icons/IconDownload.vue";

const updateInfo = ref({});
const modal = ref(null);
const progress = ref(0);
const loading = ref(false);
const downloading = ref(false)

const install = () => {
    downloading.value = true
    window.ipcRenderer.send("main:download-update");
};

const progressPercentage = computed(() => Math.round(progress.value * 100));

window.ipcRenderer.on("update-available", (event, arg) => {
    modal.value.showModal()
    updateInfo.value = arg;
    console.log(arg)
});

window.ipcRenderer.on("autoUpdater:update-info", (event, args: UpdateInfo) => {
    localStorage.updateAvailable = "true";
    if (localStorage.autoUpdate === "manual_download" || localStorage.autoUpdate === undefined) {
        return;
    }

    const baseURL = "https://github.com/laradumps/app/releases/download/";

    const tag = args.tag;

    const files = args.files;
    const filteredFiles = files.filter((file: any) => file.url.includes("dmg"));
    const fileName = filteredFiles[0].url;

    const downloadURL = `${baseURL}${tag}/${fileName}`;

    loading.value = true;
    window.ipcRenderer.send("main:download-progress-info", downloadURL);
});

window.ipcRenderer.on("autoUpdater:download-progress", (event, args: DownloadInfo) => {
    progress.value = args.percent;
});

window.ipcRenderer.on("autoUpdater:download-complete", (event, args: CompletedInfo) => {
    window.ipcRenderer.send("main:download-complete", args.path);
    loading.value = false;
});
</script>

<template>
    <div class="text-sm space-y-3 text-base-content">
        <dialog
            ref="modal"
            class="modal"
        >
            <div class="modal-box w-11/12 max-w-5xl">
                <div class="font-bold text-lg text-center">✨ Update Available</div>
                <div class="mt-2 space-y-3">
                    <div class="card card-side bg-neutral shadow-xl">
                        <div class="select-none space-y-3 card-body text-neutral-content/80">
                            <div class="flex justify-between">
                                <div>
                                    <h2 class="card-title">Version</h2>
                                    <p>{{ updateInfo.version }}</p>
                                </div>
                                <div>
                                    <h2 class="card-title">Release Date</h2>
                                    <p>{{ moment(updateInfo.releaseDate).format("MMM Do YY") }}</p>
                                </div>
                            </div>

                            <div id="releaseNotes" v-html="updateInfo.releaseNotes"></div>
                        </div>
                    </div>

                    <div class="h-[8px]">
                        <div
                            v-show="loading"
                            class="bg-accent progress rounded-full"
                            :style="{ width: progressPercentage + '%' }"
                        ></div>
                    </div>
                </div>
                <div class="modal-action">
                    <form method="dialog">
                        <button
                            class="btn btn-secondary"
                            :disabled="downloading"
                        >
                            Not now
                        </button>
                    </form>
                    <button
                        class="btn btn-primary"
                        :disabled="downloading"
                        @click="install"
                    >
                        <IconDownload class="w-5" />
                        Install
                    </button>
                </div>
            </div>
        </dialog>
    </div>
</template>
<style>
#releaseNotes h2 {
    font-size: 1.125rem !important;
    line-height: 1.75rem !important;
    font-weight: 600 !important;
}

#releaseNotes ol, ul, menu {
    list-style: disc !important;
    margin-left: 36px !important;;
    padding: 2px;
}
</style>
