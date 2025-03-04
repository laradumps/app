<script setup lang="ts">
import { Pane, Splitpanes } from "splitpanes";
import "splitpanes/dist/splitpanes.css";
import { Attachment, Mail, mimeTypeMap, useMailStore } from "@/store/mail";
import moment from "moment";
import { computed, defineProps, nextTick, ref } from "vue";
import { CloudArrowDownIcon, TrashIcon, DevicePhoneMobileIcon, DeviceTabletIcon, ComputerDesktopIcon } from "@heroicons/vue/24/outline";
import IconExternalLink from "@/components/Icons/IconExternalLink.vue";
import DumpLink from "@/components/DumpLink.vue";

const mailStore = useMailStore();

const visited = ref<Mail>();
const previewUrl = ref<string>("");
const search = ref<string>("");
const previewMode = ref<string>("desktop");

const props = defineProps<{
    items: any;
}>();

const display = (mail: Mail) => {
    mailStore.visited(mail.message_id);
    visited.value = mail;

    previewUrl.value = Math.random().toString(36).slice(2, 7);

    window.ipcRenderer.send("main:create-static-tmp-file", {
        name: previewUrl.value,
        content: visited.value.html
    });
};

const clear = () => {
    visited.value = undefined;
    mailStore.clear();
};

const mails = computed(() => {
    const items = props.items ? props.items : mailStore.mails;

    if (search.value) {
        const searchString = search.value.toLowerCase();
        return items.filter((mail) => {
            return JSON.stringify(mail).toLowerCase().includes(searchString);
        });
    }

    return items;
});

const openDumps = () => {
    nextTick(() => {
        if (visited.value) {
            const sfDumpId = visited.value.details[1];

            const sfDump = document.getElementById(`sf-dump-${sfDumpId}`);

            if (!sfDump?.hasAttribute("has-dump-js")) {
                sfDump?.setAttribute("has-dump-js", "true");
                if (visited.value.details[1]) {
                    window.Sfdump(`sf-dump-${visited.value.details[1]}`);
                }
            }

            modal.showModal();
        }
    });
};

const openHeaders = () => {
    modal_headers.showModal();
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

const openTmpBrowserPreview = () => {
    window.ipcRenderer.send("main:openLink", `http://localhost:9191/${previewUrl.value}.html`);
};

const previewStyle = computed(() => {
    return `
        width: ${previewMode.value === "mobile" ? "375px" : previewMode.value === "tablet" ? "768px" : "1024px"};
        height: ${previewMode.value === "mobile" ? "667px" : previewMode.value === "tablet" ? "1024px" : "768px"};
        transform: scale(1);
        transform-origin: top left;
        overflow: hidden;
    `;
});

// const createNewWindow = () => {
//     window.ipcRenderer.send("main:open-custom-window", {
//         title: 1,
//         url: `http://localhost:9191/${previewUrl.value}.html`
//     });
// };

const setPreviewMode = (mode: string) => {
    previewMode.value = mode;
};
</script>

<template>
    <div class="px-3 text-sm">
        <dialog
            id="modal"
            class="modal"
            v-if="visited"
        >
            <div class="modal-box max-w-2xl">
                <div class="py-4 space-y-2">
                    <div v-html="visited.details[0]"></div>
                </div>
            </div>
            <form
                method="dialog"
                class="modal-backdrop"
            >
                <button>close</button>
            </form>
        </dialog>

        <dialog
            id="modal_headers"
            class="modal"
            v-if="visited"
        >
            <div class="modal-box max-w-2xl">
                <div class="py-4 space-y-2">
                    <div
                        v-for="header in visited.headers"
                        :key="header"
                        v-text="header"
                    ></div>
                </div>
            </div>
            <form
                method="dialog"
                class="modal-backdrop"
            >
                <button>close</button>
            </form>
        </dialog>

        <div class="space-y-3 h-[calc(100vh-140px)]">
            <div class="mt-1 flex items-center gap-2 justify-between">
                <input
                    v-model="search"
                    type="text"
                    class="w-full input input-sm"
                    :placeholder="$t('search')"
                />
                <button
                    @click="clear()"
                    class="btn btn-soft btn-sm"
                >
                    <TrashIcon class="w-4" />
                    <span class="text-xs">{{ $t("clear") }}</span>
                </button>
            </div>

            <div
                v-if="mails.length === 0"
                class="flex items-center justify-center w-full h-full"
                style="height: -webkit-fill-available"
            >
                <span class="text-sm uppercase">No mails</span>
            </div>

            <Splitpanes
                v-else
                vertical
            >
                <pane
                    size="28"
                    class="overflow-auto pb-1 text-sm"
                >
                    <div
                        class="mr-2 overflow-auto flex flex-col gap-1"
                        style="height: -webkit-fill-available"
                    >
                        <div
                            v-for="mail in mails.slice().reverse()"
                            :key="mail.message_id"
                            :class="{
                                'hover:bg-base-300 hover:rounded-md': visited?.message_id !== mail.message_id,
                                'opacity-70': mail.is_read && visited?.message_id !== mail.message_id,
                                'bg-primary text-primary-content rounded-md': visited?.message_id === mail.message_id
                            }"
                            class="p-2 space-y-2 cursor-pointer focus:bg-primary"
                            @click="display(mail)"
                        >
                            <div class="flex justify-between items-center cursor-pointer">
                                <div class="truncate">{{ mail.from_mail }}</div>
                                <span class="px-1 text-xs">{{ moment(mail.date).format("HH:mm") }}</span>
                            </div>
                            <div class="font-semibold truncate">{{ mail.subject }}</div>
                        </div>
                    </div>
                </pane>

                <pane
                    class="overflow-auto text-sm"
                    style="height: min-content"
                >
                    <div
                        v-if="visited"
                        class="w-full space-y-2 !h-[calc(100vh-150px)]"
                    >
                        <div class="p-2 pl-4">
                            <DumpLink
                                :ide-handler="visited.ide_handle"
                                class="text-xs opacity-80 link"
                            />

                            <div class="flex flex-col gap-2">
                                <div class="flex items-center w-full justify-between">
                                    <span class="font-semibold">{{ visited.subject }}</span>
                                    <div class="flex gap-2">
                                        <button
                                            @click="openDumps"
                                            class="btn btn-xs btn-soft"
                                        >
                                            Dumps
                                            <IconExternalLink class="w-4" />
                                        </button>
                                        <button
                                            @click="openHeaders"
                                            class="btn btn-xs btn-soft"
                                        >
                                            Headers
                                            <IconExternalLink class="w-4" />
                                        </button>
                                        <button
                                            @click="openTmpBrowserPreview"
                                            class="btn btn-xs btn-soft"
                                        >
                                            Browser
                                            <IconExternalLink class="w-4" />
                                        </button>
                                    </div>
                                </div>
                                <div class="flex gap-3 items-center">
                                    <span v-text="visited.headers[0]"></span>
                                </div>
                                <div class="flex gap-3 items-center"><span v-text="visited.headers[1]"></span></div>
                                <div
                                    v-if="visited.attachments.length > 0"
                                    class="flex gap-3 items-center"
                                >
                                    Attachments:
                                </div>
                                <button
                                    v-if="visited.attachments.length > 0"
                                    class="btn btn-primary flex gap-2 items-center"
                                    v-for="(attachment, index) in visited.attachments"
                                    :key="`attachment-${index}`"
                                    @click.prevent="openInBrowser(attachment)"
                                >
                                    <CloudArrowDownIcon class="w-4 h-4" />
                                    {{ attachment.filename }}
                                </button>
                            </div>
                        </div>

                        <div
                            class="px-3 w-full"
                            style="height: -webkit-fill-available"
                        >
                            <div class="flex gap-2 mb-2 items-center justify-center text-xs">
                                <button
                                    @click="setPreviewMode('mobile')"
                                    class="btn btn-xs btn-soft"
                                    :class="{ 'btn-primary': previewMode === 'mobile' }"
                                >
                                    <DevicePhoneMobileIcon class="w-4" />
                                    Mobile
                                </button>
                                <button
                                    @click="setPreviewMode('tablet')"
                                    class="btn btn-xs btn-soft"
                                    :class="{ 'btn-primary': previewMode === 'tablet' }"
                                >
                                    <DeviceTabletIcon class="w-4" />
                                    Tablet
                                </button>
                                <button
                                    @click="setPreviewMode('desktop')"
                                    class="btn btn-xs btn-soft"
                                    :class="{ 'btn-primary': previewMode === 'desktop' }"
                                >
                                    <ComputerDesktopIcon class="w-4" />
                                    Desktop
                                </button>
                            </div>

                            <div
                                v-if="visited"
                                class="w-full h-full space-y-2 p-2 pl-4"
                            >
                                <div
                                    class="w-full flex justify-center"
                                    style="height: -webkit-fill-available"
                                >
                                    <iframe
                                        class="border"
                                        :style="previewStyle"
                                        allowfullscreen
                                        frameborder="0"
                                        :src="`http://localhost:9191/${previewUrl}.html`"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div
                        v-else
                        class="flex items-center justify-center w-full h-full"
                        style="height: -webkit-fill-available"
                    >
                        <span class="text-sm uppercase">No mail selected</span>
                    </div>
                </pane>
            </Splitpanes>
        </div>
    </div>
</template>
<style>
iframe {
    width: 100%;
    height: 100%;
    object-fit: contain;
    border: none;
}
</style>
