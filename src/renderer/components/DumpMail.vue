<script setup lang="ts">
import { defineProps, onMounted, ref } from "vue";
import { Payload } from "@/types/Payload";
import { CloudArrowDownIcon, ArrowTopRightOnSquareIcon } from "@heroicons/vue/24/outline";

const filePath = ref("");

const props = defineProps<{
    payload: Payload;
}>();

interface Attachment {
    path: string | null;
    filename: string | null;
    body: string | null;
}

const mimeTypeMap: { [key: string]: string } = {
    pdf: "application/pdf",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    txt: "text/plain",
    html: "text/html"
};

const getMimeTypeFromFilename = (filename: string | null): string => {
    if (!filename) return "application/octet-stream";

    const extension = filename.split(".").pop()?.toLowerCase() || "";
    return mimeTypeMap[extension] || "application/octet-stream";
};

const openInBrowser = (attachment: Attachment) => {
    if (attachment.path) {
        window.ipcRenderer.send("main:openLink", "file:///" + attachment.path);

        return;
    }

    if (attachment.body && attachment.filename) {
        const bin = atob(attachment.body);

        const byteArray = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) {
            byteArray[i] = bin.charCodeAt(i);
        }

        const mimeType = getMimeTypeFromFilename(attachment.filename);

        const blob = new Blob([byteArray], { type: mimeType });

        const url = URL.createObjectURL(blob);

        window.open(url, "_blank");

        setTimeout(() => URL.revokeObjectURL(url), 100);
    }
};

const createNewWindow = () => {
    window.ipcRenderer.send("main:open-custom-window", {
        title: props.payload.mail.headers.toString(),
        url: `http://localhost:9191/${filePath.value}.html`
    });
};

onMounted(() => {
    filePath.value = Math.random().toString(36).slice(2, 7);

    window.ipcRenderer.send("main:create-static-tmp-file", {
        name: filePath.value,
        content: props.payload.mail.html
    });

    if (props.payload.mail.details[1]) {
        window.Sfdump(`sf-dump-${props.payload.mail.details[1]}`);
    }
});
</script>

<template>
    <div class="text-base-content">
        <div
            role="tablist"
            class="tabs tabs-lifted"
        >
            <input
                type="radio"
                :name="'my_tabs_' + props.payload.id"
                role="tab"
                class="tab"
                aria-label="Header"
                checked
            />
            <div
                role="tabpanel"
                class="tab-content bg-base-100 p-4 rounded-md"
            >
                <div
                    v-for="header in props.payload.mail.headers"
                    :key="header"
                    v-text="header"
                ></div>

                <div class="flex justify-center mt-3 my-2">
                    <button
                        @click.prevent="createNewWindow()"
                        class="btn btn-primary text-primary-content !h-[38px] !px-4"
                    >
                        View Content
                        <ArrowTopRightOnSquareIcon class="w-5" />
                    </button>
                </div>
            </div>

            <input
                v-if="props.payload.mail.attachments.length > 0"
                type="radio"
                :name="'my_tabs_' + props.payload.id"
                role="tab"
                class="tab"
                aria-label="Attachments"
            />
            <div
                v-if="props.payload.mail.attachments.length > 0"
                role="tabpanel"
                class="tab-content bg-base-100 border-base-300 rounded-box p-6"
            >
                <div class="flex gap-2">
                    <button
                        class="btn btn-primary flex gap-2 items-center"
                        v-for="attachment in props.payload.mail.attachments"
                        :key="attachment"
                        @click.prevent="openInBrowser(attachment)"
                    >
                        <CloudArrowDownIcon class="w-4 h-4" />
                        {{ attachment.filename }}
                    </button>
                </div>
            </div>

            <input
                type="radio"
                :name="'my_tabs_' + props.payload.id"
                role="tab"
                class="tab"
                aria-label="Dump"
            />
            <div
                role="tabpanel"
                class="tab-content bg-base-100 border-base-300 rounded-box p-6"
            >
                <div v-html="props.payload.mail.details[0]"></div>
            </div>
        </div>
    </div>
</template>
