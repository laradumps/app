<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps<{
    installActive: boolean;
    installFinished: boolean;
    installFailed: boolean;
    installErrorMessage: string;
    projectSetupLogs: string;
}>();

const emit = defineEmits<{
    (e: 'retry'): void;
    (e: 'finish'): void;
    (e: 'copyLogs', text: string): void;
}>();

const setupLogsTextarea = ref<HTMLTextAreaElement | null>(null);

watch(
    () => props.projectSetupLogs,
    () => {
        if (setupLogsTextarea.value) {
            setupLogsTextarea.value.scrollTop = setupLogsTextarea.value.scrollHeight;
        }
    }
);

const statusText = computed(() => {
    if (props.installFinished) return t('install_success');
    if (props.installFailed) return t('install_failed');
    return t('installing');
});

const messageText = computed(() => {
    if (props.installFinished) return t('install_success_message');
    if (props.installFailed) return props.installErrorMessage || t('install_failed_message');
    return t('installing_wait_message');
});
</script>

<template>
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
                        @click="emit('retry')"
                    >
                        {{ t('retry') }}
                    </button>
                    <button
                        class="btn btn-sm"
                        :class="{ 'btn-primary': installFinished, 'btn-ghost': installFailed }"
                        @click="emit('finish')"
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
            <div class="flex items-center justify-between px-4 py-2 bg-base-300 border-b border-base-content/10">
                <span class="text-xs font-mono text-base-content/50 uppercase tracking-wider">Setup Logs</span>
                <button
                    class="btn btn-ghost btn-xs text-info hover:bg-info/10"
                    @click="emit('copyLogs', projectSetupLogs)"
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
</template>
