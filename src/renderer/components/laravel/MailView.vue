<script setup lang="ts">
import SplitPanes from '@/components/split/SplitPanes.vue';
import { Attachment, Mail, mimeTypeMap, useMailStore } from '@/store/mail';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);
import { computed, nextTick, ref } from 'vue';
import {
    CloudArrowDownIcon,
    TrashIcon,
    DevicePhoneMobileIcon,
    DeviceTabletIcon,
    ComputerDesktopIcon
} from '@heroicons/vue/24/outline';
import IconExternalLink from '@/components/Icons/IconExternalLink.vue';
import DumpLink from '@/components/dumps/DumpLink.vue';
import RelatedJobButton from '@/components/shared/RelatedJobButton.vue';
import { modifyHtml } from './../utils';
import SvgEmpty from '@/components/svg/SvgEmpty.vue';
import { useCurrentProject } from '@/store/current-project';
import VueJsonPretty from 'vue-json-pretty';
import { useGlobalSearchStore } from '@/store/global-search';

const mailStore = useMailStore();
const currentProjectStore = useCurrentProject();
const globalSearchStore = useGlobalSearchStore();

const visited = ref<Mail>();
const previewUrl = ref<string>('');
const previewMode = ref<string>('mobile');

const props = defineProps<{
    items: any;
    inScreenWindow: boolean;
    hideHeader?: boolean;
}>();

window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'open-external-link-' + previewUrl.value) {
        window.ipcRenderer.send('main:openLink', event.data.url);
        event.preventDefault();
    }
});

const display = (mail: Mail) => {
    mailStore.visited(mail.message_id);
    visited.value = mail;

    previewUrl.value = Math.random().toString(36).slice(2, 12);

    const modifiedHtml = modifyHtml(visited.value.html, previewUrl.value);

    window.ipcRenderer.send('main:create-static-tmp-file', {
        name: previewUrl.value,
        content: modifiedHtml
    });
};

const clear = () => {
    visited.value = undefined;
    mailStore.clear();
};

const removeMail = (messageId: string) => {
    mailStore.remove(messageId);

    if (visited.value?.message_id === messageId) {
        visited.value = undefined;
    }
};

const mails = computed(() => {
    const items = props.items ? props.items : mailStore.mails;

    return items.filter((mail) => {
        return JSON.stringify(mail).toLowerCase().includes(globalSearchStore.search.toLowerCase());
    });
});

const openContext = () => {
    nextTick(() => {
        if (visited.value) {
            modal_context.showModal();
        }
    });
};

const openDumps = () => {
    nextTick(() => {
        if (visited.value) {
            const sfDumpId = visited.value.details[1];

            const sfDump = document.getElementById(`sf-dump-${sfDumpId}`);

            if (!sfDump?.hasAttribute('has-dump-js')) {
                sfDump?.setAttribute('has-dump-js', 'true');
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
    if (!filename) return 'application/octet-stream';

    const extension = filename.split('.').pop()?.toLowerCase() || '';
    return mimeTypeMap[extension] || 'application/octet-stream';
};

const openInBrowser = (attachment: Attachment) => {
    if (attachment.path) {
        const currentProject = currentProjectStore.value;

        if (attachment.path.startsWith('/var/www/html')) {
            attachment.path = attachment.path.replace('/var/www/html', currentProject);
        }

        window.ipcRenderer.send('main:openLink', 'file:///' + attachment.path);

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

        window.open(url, '_blank');

        setTimeout(() => URL.revokeObjectURL(url), 100);
    }
};

const openTmpBrowserPreview = () => {
    window.ipcRenderer.send('main:openLink', `http://localhost:9191/${previewUrl.value}.html`);
};

const previewSize = computed(() => {
    return previewMode.value === 'mobile' ? '415px' : previewMode.value === 'tablet' ? '768px' : '1024px';
});

const previewStyle = computed(() => {
    return `
        width: ${previewMode.value === 'mobile' ? '415px' : previewMode.value === 'tablet' ? '768px' : '1024px'};
        height: 100%;
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
    <div>
        <!-- Actions bar -->
        <div
            v-if="!hideHeader"
            class="flex items-center justify-between w-full h-9 px-3"
        >
            <!-- Left: title -->
            <span class="text-[10px] font-bold uppercase tracking-widest text-base-content/70 select-none">Mail</span>

            <!-- Right: actions -->
            <div class="flex items-center gap-1">
                <button
                    v-if="mails.length > 0"
                    @click="clear()"
                    class="btn btn-ghost btn-circle btn-sm text-error/70 hover:text-error"
                    data-tippy-content="Clear All"
                >
                    <TrashIcon class="w-4" />
                </button>
            </div>
        </div>

        <div class="text-sm">
            <dialog
                id="modal_context"
                class="modal"
                v-if="visited"
            >
                <div class="modal-box max-w-2xl">
                    <div class="space-y-2">
                        <div class="font-semibold">Context</div>
                        <VueJsonPretty
                            :show-icon="true"
                            :show-length="true"
                            :show-line="false"
                            :data="visited.context"
                            :show-double-quotes="false"
                            class="!text-sm"
                            :deep="2"
                        />
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

            <div :class="inScreenWindow ? 'space-y-3 h-[calc(100vh-140px)]' : 'space-y-3 h-[calc(100vh-180px)]'">
                <SplitPanes
                    v-if="mails.length > 0"
                    orientation="vertical"
                    :initial-split="28"
                >
                    <template #pane-a>
                        <div
                            class="overflow-auto flex flex-col gap-1 px-3"
                            style="height: -webkit-fill-available"
                        >
                            <div
                                v-for="mail in mails.slice().reverse()"
                                :key="mail.message_id"
                                :id="`ld-anchor-${mail.message_id}`"
                                :class="{
                                    'hover:bg-base-300 hover:rounded-md': visited?.message_id !== mail.message_id,
                                    'opacity-40 !font-normal': mail.is_read && visited?.message_id !== mail.message_id,
                                    'border-primary text-primary rounded-xs bg-base-300':
                                        visited?.message_id === mail.message_id
                                }"
                                class="p-2 px-3 space-y-2 cursor-pointer focus:bg-primary"
                                @click="display(mail)"
                            >
                                <div class="flex justify-between items-center cursor-pointer">
                                    <div class="truncate">{{ mail.from_mail }}</div>
                                    <div class="flex items-center gap-2">
                                        <RelatedJobButton
                                            v-if="mail.related_job"
                                            :related-job="mail.related_job"
                                            :origin-id="mail.message_id"
                                        />
                                        <span class="px-1 text-xs">{{ dayjs(mail.date).format('HH:mm') }}</span>
                                        <button
                                            @click.stop="removeMail(mail.message_id)"
                                            class="text-base-content/50 hover:text-error text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Remove mail"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>
                                <div
                                    :class="{
                                        '!font-normal': mail.is_read && visited?.message_id !== mail.message_id
                                    }"
                                    class="font-semibold truncate"
                                >
                                    {{ mail.subject }}
                                </div>
                            </div>
                        </div>
                    </template>

                    <template #pane-b>
                        <div class="overflow-auto ml-2 text-sm">
                            <div
                                v-if="visited"
                                class="flex flex-col w-full space-y-2 !h-[calc(100vh-150px)]"
                            >
                                <!-- header -->
                                <div class="px-2">
                                    <DumpLink
                                        :ide-handler="visited.ide_handle"
                                        class="text-xs my-2 opacity-80 link"
                                    />

                                    <div class="mt-1 flex flex-col gap-2">
                                        <div class="flex flex-wrap gap-2 items-center w-full justify-between">
                                            <span class="font-semibold">{{ visited.subject }}</span>
                                        </div>
                                        <div class="flex flex-wrap justify-between gap-3">
                                            <div class="flex gap-3 items-center">
                                                <span v-text="visited.headers[0]"></span>
                                            </div>
                                            <div class="flex flex-row gap-3 items-center">
                                                <span v-text="visited.headers[1]"></span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="flex px-3 py-2 gap-2 flex-wrap items-center justify-between">
                                    <div class="flex gap-2 items-center justify-center text-xs">
                                        <button
                                            @click="setPreviewMode('mobile')"
                                            class="btn btn-xs btn-soft"
                                            :class="{ 'btn-primary': previewMode === 'mobile' }"
                                        >
                                            <DevicePhoneMobileIcon class="w-4" />
                                        </button>
                                        <button
                                            @click="setPreviewMode('tablet')"
                                            class="btn btn-xs btn-soft"
                                            :class="{ 'btn-primary': previewMode === 'tablet' }"
                                        >
                                            <DeviceTabletIcon class="w-4" />
                                        </button>
                                        <button
                                            @click="setPreviewMode('desktop')"
                                            class="btn btn-xs btn-soft"
                                            :class="{ 'btn-primary': previewMode === 'desktop' }"
                                        >
                                            <ComputerDesktopIcon class="w-4" />
                                        </button>
                                        <span class="text-xs">{{ previewSize }}</span>
                                    </div>

                                    <div class="flex gap-2">
                                        <button
                                            v-if="visited.context && Object.values(visited.context).length > 0"
                                            @click="openContext"
                                            class="btn btn-xs btn-outline border-base-content/10"
                                        >
                                            Context
                                        </button>
                                        <button
                                            @click="openDumps"
                                            class="btn btn-xs btn-outline border-base-content/10"
                                        >
                                            Dumps
                                        </button>
                                        <button
                                            @click="openHeaders"
                                            class="btn btn-xs btn-outline border-base-content/10"
                                        >
                                            Headers
                                        </button>
                                        <button
                                            @click="openTmpBrowserPreview"
                                            class="btn btn-xs btn-outline border-base-content/10"
                                        >
                                            Browser
                                            <IconExternalLink class="w-4" />
                                        </button>
                                    </div>
                                </div>

                                <!-- body -->
                                <div
                                    v-if="visited"
                                    class="w-full flex-1 flex flex-col"
                                >
                                    <!-- email content iframe -->
                                    <div class="w-full flex-1 flex justify-center mb-4">
                                        <div class="group p-2 space-y-2 cursor-pointer focus:bg-primary">
                                            <iframe
                                                class="iframe-content"
                                                :style="previewStyle"
                                                allowfullscreen
                                                frameborder="0"
                                                :src="`http://localhost:9191/temp/${previewUrl}.html`"
                                            />
                                        </div>
                                    </div>

                                    <!-- attachments -->
                                    <div
                                        v-if="visited.attachments.length > 0"
                                        class="w-full px-4 py-2 border-t border-base-300"
                                    >
                                        <div class="font-semibold mb-2">Attachments:</div>
                                        <div class="flex flex-wrap gap-2">
                                            <button
                                                v-for="(attachment, index) in visited.attachments"
                                                :key="`attachment-${index}`"
                                                class="btn btn-neutral flex gap-2 items-center"
                                                @click.prevent="openInBrowser(attachment)"
                                            >
                                                <CloudArrowDownIcon class="w-4 h-4" />
                                                {{ attachment.filename }}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div
                                v-else
                                class="w-full h-full"
                                style="height: -webkit-fill-available"
                            ></div>
                        </div>
                    </template>
                </SplitPanes>

                <div
                    v-else
                    class="-mt-[90px] -ml-8 absolute flex items-center justify-center w-full pointer-events-none"
                    style="height: -webkit-fill-available"
                >
                    <SvgEmpty class="w-30 opacity-25" />
                    <div class="text-base-content/70">
                        <h1 class="text-lg font-semibold mb-2">Empty</h1>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
@reference "./../../styles.css";

iframe {
    width: 100%;
    height: 100%;
    object-fit: contain;
    border: none;
}

.smartphone {
    position: relative;
    width: 430px;
    height: 640px;
    margin: auto;
    border: 8px black solid;
    border-top-width: 40px;
    border-bottom-width: 40px;
    border-radius: 36px;
}

.smartphone:before {
    content: '';
    display: block;
    width: 40px;
    height: 5px;
    position: absolute;
    top: -30px;
    left: 50%;
    transform: translate(-50%, -50%);
    background: #333;
    border-radius: 10px;
}

/* The circle on the bottom of the device */
.smartphone:after {
    content: '';
    display: block;
    width: 25px;
    height: 25px;
    position: absolute;
    left: 50%;
    bottom: -45px;
    transform: translate(-50%, -50%);
    background: #333;
    border-radius: 50%;
}

.smartphone .content {
    width: 360px;
    height: 640px;
    background: white;
}

.tablet {
    position: relative;
    width: 798px;
    height: -webkit-fill-available;
    margin: auto;
    border: 16px black solid;
    border-top-width: 60px;
    border-bottom-width: 60px;
    border-radius: 36px;
}

.tablet:before {
    content: '';
    display: block;
    width: 60px;
    height: 5px;
    position: absolute;
    top: -30px;
    left: 50%;
    transform: translate(-50%, -50%);
    background: #333;
    border-radius: 10px;
}

.tablet:after {
    content: '';
    display: block;
    width: 35px;
    height: 35px;
    position: absolute;
    left: 50%;
    bottom: -65px;
    transform: translate(-50%, -50%);
    background: #333;
    border-radius: 50%;
}

.tablet .content {
    width: 768px;
    height: 1024px;
    background: white;
    margin: -1px;
}
</style>
