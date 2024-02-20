<template>
    <div
        v-if="loading"
        class="text-sm dark:text-base-300 p-3 w-[150px] fixed right-2"
    >
        <div class="w-full bg-gray-200 rounded-full h-[8px] dark:bg-gray-700">
            <div
                class="bg-blue-600 h-[8px] rounded-full"
                :style="{ width: progressPercentage + '%' }"
            ></div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import IpcMainEvent = Electron.IpcMainEvent;
import { UpdateInfo } from "electron-updater";
import { CompletedInfo, DownloadInfo } from "@/types/Updater";

const progress = ref(0);
const loading = ref(false);

const progressPercentage = computed(() => {
    return Math.round(progress.value * 100);
});

onMounted(() => {
    window.ipcRenderer.on("autoUpdater:update-info", (event: IpcMainEvent, args: UpdateInfo) => {
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

    window.ipcRenderer.on("autoUpdater:download-progress", (event: IpcMainEvent, args: DownloadInfo) => {
        progress.value = args.percent;
    });

    window.ipcRenderer.on("autoUpdater:download-complete", (event: IpcMainEvent, args: CompletedInfo) => {
        window.ipcRenderer.send("main:download-complete", args.path);
        loading.value = false;
    });
});
</script>
