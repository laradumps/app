<template>
    <div class="dark:text-slate-400 rounded-sm px-2 p-1 space-y-3">
        <div class="space-y-1">
            <div class="dark:text-slate-300 font-normal">Headers:</div>
            <div
                v-for="header in props.payload.mail.headers"
                :key="header"
                v-text="header"
            ></div>
        </div>

        <div class="space-y-1">
            <div class="dark:text-slate-300 font-normal">Attachments:</div>
            <div class="flex gap-2">
                <button
                    class="btn-rounded-white"
                    v-for="attachment in props.payload.mail.attachments"
                    :key="attachment"
                    @click.prevent="openInBrowser(attachment.path)"
                >
                    <CloudArrowDownIcon class="w-4 h-4" />
                    {{ attachment.filename }}
                </button>
            </div>
        </div>

        <div>
            <div class="dark:text-slate-300 font-normal flex justify-between">
                Content:
                <button
                    class="flex gap-2"
                    @click.prevent="createNewWindow()"
                >
                    <ArrowTopRightOnSquareIcon class="w-4" />
                    New Window
                </button>
            </div>

            <div class="mt-2 h-[415px] w-full">
                <iframe
                    :src="`http://localhost:9191/${filePath}.html`"
                    width="100%"
                    height="100%"
                ></iframe>
            </div>
        </div>

        <div class="space-y-1">
            <div class="dark:text-slate-300 font-normal">Details:</div>
            <div
                class="bg-slate-100 space-y-2 dark:bg-slate-800 rounded-sm p-2"
                v-html="props.payload.mail.details[0]"
            ></div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { defineProps, onMounted, ref } from "vue";
import { Payload } from "@/types/Payload";
import { CloudArrowDownIcon, ArrowTopRightOnSquareIcon } from "@heroicons/vue/24/outline";
import CryptoJS from "crypto-js";

const filePath = ref("");

const props = defineProps<{
    payload: Payload;
}>();

const openInBrowser = (path: string) => {
    window.ipcRenderer.send("main:openLink", "file:///" + path);
};

const createNewWindow = () => {
    window.ipcRenderer.send("main:open-custom-window", {
        title: props.payload.mail.headers.toString(),
        url: `http://localhost:9191/${filePath.value}.html`
    });
};

onMounted(() => {
    filePath.value = CryptoJS.MD5(props.payload.mail.html).toString();

    window.ipcRenderer.send("main:create-static-tmp-file", {
        name: filePath.value,
        content: props.payload.mail.html
    });

    if (props.payload.mail.details[1]) {
        window.Sfdump(`sf-dump-${props.payload.mail.details[1]}`);
    }
});
</script>
