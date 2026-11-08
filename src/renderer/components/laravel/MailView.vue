<script setup lang="ts">
import SplitPanes from '@/components/split/SplitPanes.vue';
import { Attachment, Mail, mimeTypeMap, useMailStore } from '@/store/mail';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import {
    DevicePhoneMobileIcon,
    DeviceTabletIcon,
    ComputerDesktopIcon,
    PaperClipIcon,
    XMarkIcon
} from '@heroicons/vue/24/outline';
import IconExternalLink from '@/components/Icons/IconExternalLink.vue';
import DumpLink from '@/components/dumps/DumpLink.vue';
import RelatedJobButton from '@/components/shared/RelatedJobButton.vue';
import { modifyHtml } from '@/utils/helpers';
import { matchesMailSearch } from '@/utils/searchMatchers';
import EmptyState from '@/components/common/EmptyState.vue';
import { useCurrentProject } from '@/store/current-project';
import VueJsonPretty from 'vue-json-pretty';
import { useGlobalSearchStore } from '@/store/global-search';
import { useRowExpand } from '@/composables/useRowExpand';

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

const mailFrame = ref<HTMLIFrameElement>();

const onExternalLinkMessage = (event: MessageEvent) => {
    if (event.source !== mailFrame.value?.contentWindow || !/^(https?|mailto):/i.test(String(event.data?.url))) {
        return;
    }

    if (event.data.type === 'open-external-link-' + previewUrl.value) {
        window.ipcRenderer.send('main:openLink', event.data.url);
        event.preventDefault();
    }
};

onMounted(() => window.addEventListener('message', onExternalLinkMessage));
onUnmounted(() => window.removeEventListener('message', onExternalLinkMessage));

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

const removeMail = (messageId: string) => {
    mailStore.remove(messageId);

    if (visited.value?.message_id === messageId) {
        openId.value = null;
    }
};

const { openId, isOpen, onRowKeydown } = useRowExpand();
watch(openId, (id) => {
    const mail = id && mails.value.find((item) => item.message_id === id);
    if (mail) display(mail);
    else visited.value = undefined;
});

const mails = computed(() => {
    const items = props.items ? props.items : mailStore.mails;
    const search = globalSearchStore.search.toLowerCase().trim();

    if (!search) return items;

    return items.filter((mail) => matchesMailSearch(mail, search));
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
    window.ipcRenderer.send('main:openLink', `http://localhost:9191/temp/${previewUrl.value}.html`);
};

const PREVIEW_MODES = [
    { key: 'mobile', label: 'Mobile', width: '415px', icon: DevicePhoneMobileIcon },
    { key: 'tablet', label: 'Tablet', width: '768px', icon: DeviceTabletIcon },
    { key: 'desktop', label: 'Desktop', width: '1024px', icon: ComputerDesktopIcon }
];

const previewWidth = computed(() => PREVIEW_MODES.find((mode) => mode.key === previewMode.value)?.width ?? '415px');

const headerValue = (mail: Mail, name: string) =>
    mail.headers
        ?.find((header) => header.startsWith(`${name}:`))
        ?.slice(name.length + 1)
        .trim() ?? '';

const sender = (mail: Mail) => mail.from || mail.from_mail || headerValue(mail, 'From');

const addresses = computed(() =>
    visited.value
        ? ['From', 'To', 'Cc', 'Bcc']
              .map((name) => [name, headerValue(visited.value!, name)])
              .filter(([, value]) => value)
        : []
);
</script>

<template>
    <div class="flex flex-col h-full min-h-0 min-w-0 overflow-hidden">
        <div class="text-sm flex flex-col flex-1 min-h-0">
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
                        <div v-safe-html="visited.details[0]"></div>
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

            <div class="flex-1 min-h-0 overflow-hidden">
                <SplitPanes
                    v-if="mails.length > 0"
                    orientation="vertical"
                    :initial-split="28"
                >
                    <template #pane-a>
                        <div
                            class="h-full overflow-auto flex flex-col gap-0.5 p-1.5"
                            data-row-list
                        >
                            <div
                                v-for="mail in mails.slice().reverse()"
                                :key="mail.message_id"
                                :id="`ld-anchor-${mail.message_id}`"
                                :data-row-id="mail.message_id"
                                tabindex="0"
                                :aria-selected="isOpen(mail.message_id)"
                                :class="{ 'is-open': isOpen(mail.message_id) }"
                                class="ld-row group relative pl-4 pr-2 py-2 rounded-md space-y-0.5"
                                @click="openId = mail.message_id"
                                @keydown="onRowKeydown($event, mail.message_id)"
                            >
                                <span
                                    v-if="!mail.is_read"
                                    class="absolute left-1.5 top-[0.9rem] size-1.5 rounded-full bg-primary"
                                    title="Unread"
                                />
                                <div class="flex items-center gap-2">
                                    <span
                                        class="flex-1 truncate"
                                        :class="mail.is_read ? 'text-base-content/60' : 'font-medium text-base-content'"
                                        >{{ sender(mail) }}</span
                                    >
                                    <PaperClipIcon
                                        v-if="mail.attachments?.length"
                                        class="size-3.5 shrink-0 text-base-content/40"
                                    />
                                    <RelatedJobButton
                                        v-if="mail.related_job"
                                        :related-job="mail.related_job"
                                        :origin-id="mail.message_id"
                                    />
                                    <span class="shrink-0 text-[11px] tabular-nums text-base-content/40">{{
                                        dayjs(mail.date).format('HH:mm')
                                    }}</span>
                                    <button
                                        type="button"
                                        @click.stop="removeMail(mail.message_id)"
                                        class="grid place-items-center size-4 shrink-0 rounded text-base-content/40 hover:text-error hover:bg-error/10 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity cursor-pointer"
                                        title="Remove mail"
                                    >
                                        <XMarkIcon class="size-3" />
                                    </button>
                                </div>
                                <div
                                    class="truncate text-xs"
                                    :class="mail.is_read ? 'text-base-content/45' : 'text-base-content/75'"
                                >
                                    {{ mail.subject }}
                                </div>
                            </div>
                        </div>
                    </template>

                    <template #pane-b>
                        <div
                            v-if="visited"
                            class="flex flex-col h-full min-h-0 text-sm"
                        >
                            <header class="shrink-0 px-5 pt-4 pb-3 space-y-2.5">
                                <h2 class="text-base font-semibold leading-snug select-text">{{ visited.subject }}</h2>

                                <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
                                    <template
                                        v-for="[name, value] in addresses"
                                        :key="name"
                                    >
                                        <dt class="text-base-content/40">{{ name }}</dt>
                                        <dd class="truncate text-base-content/80 select-text">{{ value }}</dd>
                                    </template>
                                </dl>

                                <div class="flex items-center gap-1.5 text-[11px] text-base-content/40">
                                    <span class="tabular-nums">{{
                                        dayjs(visited.date).format('MMM D, HH:mm:ss')
                                    }}</span>
                                    <span>·</span>
                                    <DumpLink
                                        :key="visited.message_id"
                                        :ide-handler="visited.ide_handle"
                                        class="hover:text-base-content"
                                    />
                                </div>

                                <div
                                    v-if="visited.attachments.length > 0"
                                    class="flex flex-wrap gap-1.5 pt-1"
                                >
                                    <button
                                        v-for="(attachment, index) in visited.attachments"
                                        :key="`attachment-${index}`"
                                        type="button"
                                        class="inline-flex items-center gap-1.5 h-6 px-2 rounded-md text-xs text-base-content/80 ring-1 ring-base-content/10 hover:bg-base-content/5 cursor-pointer"
                                        @click.prevent="openInBrowser(attachment)"
                                    >
                                        <PaperClipIcon class="size-3.5 text-base-content/40" />
                                        {{ attachment.filename }}
                                    </button>
                                </div>
                            </header>

                            <div
                                class="shrink-0 flex items-center justify-between gap-2 px-4 py-1.5 border-y border-base-content/10"
                            >
                                <div class="join">
                                    <button
                                        v-for="mode in PREVIEW_MODES"
                                        :key="mode.key"
                                        type="button"
                                        class="join-item btn btn-xs btn-ghost px-2"
                                        :class="
                                            previewMode === mode.key
                                                ? 'btn-active text-base-content'
                                                : 'text-base-content/50'
                                        "
                                        :title="`${mode.label} · ${mode.width}`"
                                        @click="previewMode = mode.key"
                                    >
                                        <component
                                            :is="mode.icon"
                                            class="size-4"
                                        />
                                    </button>
                                </div>

                                <div class="flex items-center gap-0.5 text-base-content/60">
                                    <button
                                        v-if="visited.context && Object.values(visited.context).length > 0"
                                        type="button"
                                        class="btn btn-xs btn-ghost font-normal"
                                        @click="openContext"
                                    >
                                        Context
                                    </button>
                                    <button
                                        type="button"
                                        class="btn btn-xs btn-ghost font-normal"
                                        @click="openDumps"
                                    >
                                        Dumps
                                    </button>
                                    <button
                                        type="button"
                                        class="btn btn-xs btn-ghost font-normal"
                                        @click="openHeaders"
                                    >
                                        Headers
                                    </button>
                                    <button
                                        type="button"
                                        class="btn btn-xs btn-ghost font-normal gap-1"
                                        title="Open in browser"
                                        @click="openTmpBrowserPreview"
                                    >
                                        Browser
                                        <IconExternalLink class="w-3.5" />
                                    </button>
                                </div>
                            </div>

                            <div class="flex-1 min-h-0 flex justify-center-safe overflow-x-auto p-4 bg-base-content/[0.03]">
                                <iframe
                                    ref="mailFrame"
                                    sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
                                    class="h-full shrink-0 rounded-lg bg-white shadow-sm ring-1 ring-base-content/10"
                                    :style="{ width: previewWidth }"
                                    :src="`http://localhost:9191/temp/${previewUrl}.html`"
                                />
                            </div>
                        </div>
                    </template>
                </SplitPanes>

                <div
                    v-else
                    class="flex items-center justify-center h-full pointer-events-none"
                >
                    <EmptyState screen="mail" />
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
iframe {
    border: none;
}
</style>
