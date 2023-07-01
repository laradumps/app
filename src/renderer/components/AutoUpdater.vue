<template>
    <div
        v-if="loading"
        class="text-sm dark:text-slate-300 p-3 w-[150px] fixed right-2"
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

const progress = ref(0);
const loading = ref(false);

const progressPercentage = computed(() => {
    return Math.round(progress.value * 100);
});

interface DownloadInfo {
    percent: number,
    transferredBytes: number,
    totalBytes: number
}

interface CompletedInfo {
    fileName: string;
    filename: string;
    path: string;
    fileSize: number;
    mimeType: string;
    url: string;
}

onMounted(() => {
    window.ipcRenderer.on("update-info", (event: IpcMainEvent, args: UpdateInfo | any) => {
        const baseURL = "https://github.com/laradumps/app/releases/download/";

        const tag = args.tag;
        const files = args.files;
        const filteredFiles = files.filter((file: any) => file.url.includes("dmg"));
        const fileName = filteredFiles[0].url;

        const downloadURL = `${baseURL}${tag}/${fileName}`;

        loading.value = true;
        window.ipcRenderer.send("download-latest-version", downloadURL);
    });

    window.ipcRenderer.on("download-progress", (event: IpcMainEvent, args: DownloadInfo) => {
        progress.value = args.percent;
    });

    window.ipcRenderer.on("download-complete", (event: IpcMainEvent, args: CompletedInfo) => {
        window.ipcRenderer.send("download-open-file", args.path);
        loading.value = false;
    });
});
</script>
