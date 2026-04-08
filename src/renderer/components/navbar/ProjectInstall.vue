<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import JSConfetti from 'js-confetti';
import { IpcRendererEvent } from 'electron';
import { LogEntry } from '../../../main/logger/logger';

const { t } = useI18n();

const emit = defineEmits<{
    (e: 'modalOpen'): void;
    (e: 'modalClose'): void;
    (e: 'projectAdded'): void;
}>();

const installActive = ref(false);
const installErrorMessage = ref('');
const installFinished = ref(false);
const installFailed = ref(false);
const projectSetupLogs = ref('');
const setupLogsTextarea = ref<HTMLTextAreaElement | null>(null);

let errorDismissTimer: number | null = null;

watch(installErrorMessage, (msg) => {
    if (errorDismissTimer) {
        clearTimeout(errorDismissTimer);
        errorDismissTimer = null;
    }
    if (msg) {
        errorDismissTimer = window.setTimeout(() => {
            installErrorMessage.value = '';
        }, 3000);
    }
});

watch(projectSetupLogs, () => {
    if (setupLogsTextarea.value) {
        setupLogsTextarea.value.scrollTop = setupLogsTextarea.value.scrollHeight;
    }
});

const statusText = computed(() => {
    if (installFinished.value) return t('install_success');
    if (installFailed.value) return t('install_failed');
    return t('installing');
});

const messageText = computed(() => {
    if (installFinished.value) return t('install_success_message');
    if (installFailed.value) return installErrorMessage.value || t('install_failed_message');
    return t('installing_wait_message');
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
};

const resetInstallState = () => {
    installActive.value = false;
    installFinished.value = false;
    installFailed.value = false;
    projectSetupLogs.value = '';
    installErrorMessage.value = '';
};

const closeModal = () => {
    if (installActive.value && !installFinished.value && !installFailed.value) return;
    modal_navbar_listening.close();
    emit('modalClose');
};

const finishInstallation = () => {
    resetInstallState();
    modal_navbar_listening.close();
    emit('modalClose');
};

const retry = () => {
    window.ipcRenderer.send('main:project-setup');
};

const show = () => {
    resetInstallState();
    modal_navbar_listening.showModal();
    emit('modalOpen');
};

defineExpose({ show, closeModal });

let handleComposerRef: ((event: IpcRendererEvent, payload: any) => void) | null = null;
let handleProjectSetupLogs: (_: any, payload: LogEntry) => void;
let handleProjectDirSelectedRef: ((_: any, args: any) => void) | null = null;

onMounted(() => {
    handleComposerRef = async (_: IpcRendererEvent, payload: any) => {
        if (!payload) return;

        if (payload.status === 'start') {
            installActive.value = true;
            installErrorMessage.value = '';
            installFailed.value = false;
            document.activeElement?.blur();
            modal_navbar_listening.showModal();
            emit('modalOpen');
        }

        if (payload.error) {
            installErrorMessage.value = 'An error occurred while installing.';
            installFailed.value = true;
            return;
        }

        if (payload.step === 'finish' && payload.done) {
            await sleep(500);
            installFinished.value = true;
            await new JSConfetti().addConfetti();
            emit('projectAdded');
        }
    };

    handleProjectSetupLogs = (_: any, payload: LogEntry) => {
        projectSetupLogs.value = `${projectSetupLogs.value}[${new Date(payload.timestamp).toLocaleString()}].${payload.level} ${payload.message}\n`;
    };

    handleProjectDirSelectedRef = (_: any, args: any) => {
        if (args && typeof args === 'string') {
            window.ipcRenderer.send('storage.check', { applicationPath: args });
        }
    };

    window.ipcRenderer.on('composer-auto-install', handleComposerRef);
    window.ipcRenderer.on('project-setup-logs', handleProjectSetupLogs);
    window.ipcRenderer.on('project-directory-selected', handleProjectDirSelectedRef);
});

onUnmounted(() => {
    if (errorDismissTimer) clearTimeout(errorDismissTimer);
    if (handleComposerRef) window.ipcRenderer.off('composer-auto-install', handleComposerRef);
    window.ipcRenderer.off('project-setup-logs', handleProjectSetupLogs);
    if (handleProjectDirSelectedRef) window.ipcRenderer.off('project-directory-selected', handleProjectDirSelectedRef);
});
</script>

<template>
    <dialog
        @close.prevent="closeModal"
        id="modal_navbar_listening"
        class="modal z-[200]"
    >
        <div
            class="modal-box max-w-4xl p-0! bg-base-100 shadow-2xl border border-base-content/10 rounded-2xl overflow-hidden"
        >
            <div class="flex h-144">
                <div class="flex-1 flex flex-col relative bg-base-100 overflow-y-auto w-full">
                    <div class="p-8 flex flex-col h-full gap-4">
                        <div
                            class="flex-1 flex flex-col items-center justify-center p-4 bg-base-200/50 rounded-lg border border-base-content/5 overflow-hidden"
                        >
                            <div class="text-center space-y-2 mb-4 w-full px-4">
                                <h2
                                    class="text-lg font-semibold text-base-content/70"
                                    :class="{ 'text-error': installFailed, 'text-success': installFinished }"
                                >
                                    {{ statusText }}
                                </h2>
                                <p class="text-base-content/70">
                                    {{ messageText }}
                                </p>
                                <progress
                                    v-if="!installFinished && !installFailed"
                                    class="progress w-56 progress-info"
                                ></progress>
                                <div
                                    v-else
                                    class="flex flex-col items-center gap-4"
                                >
                                    <progress
                                        class="progress w-56"
                                        :class="{
                                            'progress-success': installFinished,
                                            'progress-error': installFailed
                                        }"
                                        value="100"
                                        max="100"
                                    ></progress>
                                    <div class="flex gap-2">
                                        <button
                                            v-if="installFailed"
                                            class="btn btn-primary btn-sm"
                                            @click="retry"
                                        >
                                            {{ t('retry') }}
                                        </button>
                                        <button
                                            class="btn btn-sm"
                                            :class="{ 'btn-primary': installFinished, 'btn-ghost': installFailed }"
                                            @click="finishInstallation"
                                        >
                                            {{ installFinished ? t('finish') : t('settings.close') }}
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div
                                id="setup-logs"
                                class="w-full flex-1 flex flex-col bg-base-300 rounded-lg overflow-hidden border border-base-content/10 shadow-xl min-h-0"
                            >
                                <div
                                    class="flex items-center justify-between px-4 py-2 bg-base-300 border-b border-base-content/10"
                                >
                                    <span class="text-xs font-mono text-base-content/50 uppercase tracking-wider"
                                        >Setup Logs</span
                                    >
                                    <button
                                        class="btn btn-ghost btn-xs text-info hover:bg-info/10"
                                        @click="copyToClipboard(projectSetupLogs)"
                                    >
                                        Copy
                                    </button>
                                </div>
                                <div class="flex-1 p-0 bg-black/20 overflow-hidden">
                                    <textarea
                                        ref="setupLogsTextarea"
                                        readonly
                                        :value="projectSetupLogs"
                                        class="w-full h-full p-4 font-mono text-xs bg-transparent border-none focus:ring-0 resize-none text-base-content/80"
                                        placeholder="Waiting for logs..."
                                    ></textarea>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <form
            method="dialog"
            class="modal-backdrop"
        >
            <button>close</button>
        </form>
    </dialog>
</template>
