<template>
    <div class="dark:text-slate-400 rounded-sm px-2 p-1 space-y-2">
        <div class="space-y-1">
            <div class="dark:text-slate-300 font-normal">Headers:</div>
            <div
                v-for="header in props.payload.notification.headers"
                :key="header"
                v-text="header"
            ></div>
        </div>

        <div class="space-y-1">
            <div class="dark:text-slate-300 font-normal">Attachments:</div>
            <button
                class="btn-rounded-white"
                v-for="attachment in props.payload.notification.attachments"
                :key="attachment"
                @click.prevent="openInBrowser(attachment.path)"
            >
                <CloudArrowDownIcon class="w-4 h-4" />
                {{ attachment.filename }}
            </button>
        </div>

        <div>
            <div class="dark:text-slate-300 font-normal">Content:</div>

            <div class="mt-2 h-[415px] w-full">
                <iframe
                    :src="`http://localhost:9191/${filePath}.html`"
                    width="100%"
                    height="100%"
                ></iframe>
            </div>
        </div>

        <div
            class="bg-slate-100 space-y-2 dark:bg-slate-800 rounded-sm p-2"
            v-html="props.payload.notification.details[0]"
        ></div>
    </div>
</template>

<script setup lang="ts">
import { defineProps, onMounted, ref } from "vue";
import { Payload } from "@/types/Payload";
import { CloudArrowDownIcon } from "@heroicons/vue/20/solid";
import CryptoJS from "crypto-js";

const filePath = ref("");

const props = defineProps<{
    payload: Payload;
}>();

const openInBrowser = (path: string) => {
    window.ipcRenderer.send("main:openLink", "file:///" + path);
};

onMounted(() => {
    window.Sfdump(`sf-dump-${props.payload.notification.details[1]}`);

    filePath.value = CryptoJS.MD5(props.payload.notification.html).toString();

    console.log(filePath.value);

    window.ipcRenderer.send("main:create-static-tmp-file", {
        name: filePath.value,
        content: props.payload.notification.html
    });
});
</script>
