<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { ArrowDownTrayIcon } from '@heroicons/vue/24/solid';
import { ChevronDownIcon } from '@heroicons/vue/24/outline';
import { useSettingsStore } from '@/store/settings';
import { UpdateInfo } from 'electron-updater';
import { DownloadInfo } from '@/types/Updater';
import { escapeHtml, isHtmlContent, sanitizeReleaseNotesHtml } from '@/utils/sanitizeReleaseNotesHtml';

const settingsStore = useSettingsStore();
const updateInfo = ref<Partial<UpdateInfo>>({});
const showReleaseNotes = ref(false);

const show = computed(() => settingsStore.updateAvailable);
const downloading = computed(() => settingsStore.updateDownloading);
const progress = computed(() => settingsStore.updateProgress);
const isAutoInstallMode = computed(() => settingsStore.settings.check_for_updates === 'auto_install');

const rawReleaseNotes = computed(() => {
    const notes = updateInfo.value.releaseNotes;

    if (!notes) {
        return '';
    }

    if (typeof notes === 'string') {
        return notes.trim();
    }

    if (Array.isArray(notes)) {
        return notes
            .map((note) => {
                const version = note.version ? `<h2>${escapeHtml(note.version)}</h2>` : '';
                const body = note.note ?? '';
                const safeBody = isHtmlContent(body) ? body : escapeHtml(body).replace(/\n/g, '<br>');

                return `${version}${safeBody}`.trim();
            })
            .filter(Boolean)
            .join('');
    }

    return '';
});

const releaseNotesHtml = computed(() => {
    if (!rawReleaseNotes.value) {
        return '';
    }

    if (isHtmlContent(rawReleaseNotes.value)) {
        return sanitizeReleaseNotesHtml(rawReleaseNotes.value);
    }

    return `<p>${escapeHtml(rawReleaseNotes.value).replace(/\n/g, '<br>')}</p>`;
});

const hasReleaseNotes = computed(() => releaseNotesHtml.value.length > 0);

const close = () => {
    showReleaseNotes.value = false;
    settingsStore.markUpdated();
};

const downloadAndInstall = () => {
    settingsStore.setUpdateDownloading(true);
    window.ipcRenderer.send('main:download-update');
};

const installNow = () => {
    window.ipcRenderer.send('main:install-update');
};

const notYet = () => {
    close();
};

const toggleReleaseNotes = () => {
    showReleaseNotes.value = !showReleaseNotes.value;
};

const onReleaseNotesClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement | null;
    const anchor = target?.closest('a');

    if (!anchor?.href) {
        return;
    }

    event.preventDefault();
    window.ipcRenderer.send('main:openLink', anchor.href);
};

const onUpdateAvailable = (_: any, info: UpdateInfo) => {
    console.log('[Renderer] Update available:', info);
    updateInfo.value = info;
    showReleaseNotes.value = false;

    if (isAutoInstallMode.value) {
        console.log('[Renderer] Auto-downloading update in background (auto_install mode)...');
        settingsStore.setUpdateDownloading(true);
        downloadAndInstall();

        return;
    }

    settingsStore.setUpdateAvailable(info?.version);
};

const onDownloadProgress = (_: any, args: DownloadInfo): void => {
    let percent = 0;

    if (args && typeof args.percent !== 'undefined') {
        percent = args.percent;
        if (percent < 0 || percent <= 1) {
            percent *= 100;
        }
    }

    if (isNaN(percent)) {
        percent = 0;
    }

    settingsStore.setUpdateProgress(percent);
};

const onUpdateDownloaded = (_: any, info: UpdateInfo): void => {
    console.log('[Renderer] Update downloaded:', info);
    updateInfo.value = info;

    if (isAutoInstallMode.value) {
        settingsStore.setUpdateAvailable(info?.version);
    }

    settingsStore.setUpdateDownloaded(true);
};

const onError = (_: any, message: string): void => {
    console.error('[Renderer] Update error:', message);
    settingsStore.setUpdateDownloading(false);
};

onMounted(() => {
    window.ipcRenderer.on('autoUpdater:update-available', onUpdateAvailable);
    window.ipcRenderer.on('autoUpdater:download-progress', onDownloadProgress);
    window.ipcRenderer.on('autoUpdater:update-downloaded', onUpdateDownloaded);
    window.ipcRenderer.on('autoUpdater:error', onError);
});

onUnmounted(() => {
    window.ipcRenderer.removeListener('autoUpdater:update-available', onUpdateAvailable);
    window.ipcRenderer.removeListener('autoUpdater:download-progress', onDownloadProgress);
    window.ipcRenderer.removeListener('autoUpdater:update-downloaded', onUpdateDownloaded);
    window.ipcRenderer.removeListener('autoUpdater:error', onError);
});
</script>

<template>
    <Transition name="slide-up">
        <div
            v-if="show"
            class="fixed bottom-4 right-4 z-50 bg-neutral shadow-2xl rounded-lg max-w-md w-full mx-4"
        >
            <div class="flex items-start gap-3 p-3">
                <ArrowDownTrayIcon class="w-4 h-4 mt-0.5 shrink-0 text-accent" />

                <div class="flex-1 min-w-0">
                    <div class="font-semibold text-neutral-content text-xs">
                        {{
                            settingsStore.updateDownloaded
                                ? $t('app_update_info.update_downloaded')
                                : $t('settings.update_available')
                        }}
                    </div>
                    <div class="text-xs text-neutral-content/70 mt-1">
                        {{
                            settingsStore.updateDownloaded
                                ? $t('app_update_info.update_ready_message', { version: settingsStore.latestVersion })
                                : $t('app_update_info.update_available_message', {
                                      version: settingsStore.latestVersion
                                  })
                        }}
                    </div>

                    <button
                        v-if="hasReleaseNotes"
                        type="button"
                        class="mt-2 inline-flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors"
                        @click="toggleReleaseNotes"
                    >
                        {{ $t('app_update_info.whats_new') }}
                        <ChevronDownIcon
                            class="w-3.5 h-3.5 transition-transform duration-200"
                            :class="{ 'rotate-180': showReleaseNotes }"
                        />
                    </button>

                    <Transition name="notes">
                        <div
                            v-if="hasReleaseNotes && showReleaseNotes"
                            class="mt-2 border-t border-neutral-content/10 pt-2"
                        >
                            <div
                                class="release-notes max-h-40 overflow-y-auto rounded-md bg-neutral-content/5 p-2 text-xs text-neutral-content/70 leading-relaxed"
                                v-html="releaseNotesHtml"
                                @click="onReleaseNotesClick"
                            />
                        </div>
                    </Transition>

                    <div
                        v-if="downloading && !isAutoInstallMode"
                        class="mt-2"
                    >
                        <div class="h-1 bg-neutral-content/20 rounded-full overflow-hidden">
                            <div
                                class="h-full bg-accent transition-all duration-300"
                                :style="{ width: `${progress}%` }"
                            />
                        </div>
                        <div class="text-xs text-neutral-content/50 mt-1">{{ Math.round(progress) }}%</div>
                    </div>

                    <div class="flex gap-2 mt-3">
                        <button
                            v-if="settingsStore.updateDownloaded"
                            @click="installNow"
                            class="btn btn-sm btn-accent text-xs h-7 min-h-7"
                        >
                            {{ $t('app_update_info.restart') }}
                        </button>
                        <button
                            v-else-if="!downloading"
                            @click="downloadAndInstall"
                            class="btn btn-sm btn-accent text-xs h-7 min-h-7"
                        >
                            {{ $t('app_update_info.download_install') }}
                        </button>
                        <button
                            v-if="!downloading"
                            @click="notYet"
                            class="btn btn-sm btn-ghost text-xs h-7 min-h-7 text-neutral-content"
                        >
                            {{ $t('app_update_info.not_now') }}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </Transition>
</template>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
    transition: all 0.3s ease;
}

.slide-up-enter-from {
    opacity: 0;
    transform: translateY(20px);
}

.slide-up-leave-to {
    opacity: 0;
    transform: translateY(20px);
}

.notes-enter-active,
.notes-leave-active {
    transition: all 0.2s ease;
    overflow: hidden;
}

.notes-enter-from,
.notes-leave-to {
    opacity: 0;
    max-height: 0;
    margin-top: 0;
    padding-top: 0;
}

.notes-enter-to,
.notes-leave-from {
    opacity: 1;
    max-height: 11rem;
}

.release-notes :deep(h1),
.release-notes :deep(h2),
.release-notes :deep(h3),
.release-notes :deep(h4) {
    color: var(--color-neutral-content);
    font-size: 0.75rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
}

.release-notes :deep(ul),
.release-notes :deep(ol) {
    list-style: disc;
    padding-left: 1.1rem;
    margin: 0;
}

.release-notes :deep(li) {
    margin-bottom: 0.4rem;
}

.release-notes :deep(li:last-child) {
    margin-bottom: 0;
}

.release-notes :deep(a) {
    color: var(--color-accent);
    text-decoration: underline;
    text-underline-offset: 2px;
}

.release-notes :deep(a:hover) {
    opacity: 0.8;
}

.release-notes :deep(p) {
    margin-top: 0.5rem;
}

.release-notes :deep(p:first-child) {
    margin-top: 0;
}

.release-notes :deep(strong),
.release-notes :deep(b) {
    color: var(--color-neutral-content);
    font-weight: 600;
}

.release-notes :deep(code),
.release-notes :deep(tt) {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.7rem;
}
</style>
