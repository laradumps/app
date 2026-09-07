<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { AdjustmentsHorizontalIcon } from '@heroicons/vue/24/outline';
import IconButton from '@/components/common/IconButton.vue';
import { useCurrentProject } from '@/store/current-project';
import { useSettingsStore } from '@/store/settings';
import { SPECIAL_ENVIRONMENTS_LIST } from '@/constants';

const currentProjectStore = useCurrentProject();
const settingsStore = useSettingsStore();

const platform = ref('');

const toggleTailLog = () => {
    settingsStore.settings.tail_log_enabled = !settingsStore.settings.tail_log_enabled;
    settingsStore.update();
};

const toggleNotifications = () => {
    settingsStore.settings.show_dump_notifications = !settingsStore.settings.show_dump_notifications;
    settingsStore.update();
};

const envState = ref<Record<string, boolean>>({});

const loadEnvironmentState = () => {
    if (!currentProjectStore.projectInfo?.path) return;

    window.ipcRenderer.send('storage.get-yaml', currentProjectStore.projectInfo.path);
};

const handleYamlReply = (_: any, data: any) => {
    if (!data?.observers) return;

    const state: Record<string, boolean> = {};
    SPECIAL_ENVIRONMENTS_LIST.forEach((env) => {
        state[env.value] = data.observers[env.value] === true;
    });
    envState.value = state;
};

const toggleEnvironment = (envValue: string) => {
    if (!currentProjectStore.projectInfo?.path) return;

    const newValue = !envState.value[envValue];
    envState.value[envValue] = newValue;

    window.ipcRenderer.send('storage.update-section', {
        path: currentProjectStore.projectInfo.path,
        section: 'observers',
        values: { [envValue]: newValue }
    });

    window.ipcRenderer.send('storage.get-environments', currentProjectStore.projectInfo.path);
};

const handlePlatformReply = (_event: unknown, args: any) => {
    platform.value = args;
};

onMounted(() => {
    loadEnvironmentState();
    window.ipcRenderer.on('storage.get-yaml.reply', handleYamlReply);

    window.ipcRenderer.send('platform');
    window.ipcRenderer.on('platform.reply', handlePlatformReply);
});

onUnmounted(() => {
    window.ipcRenderer.off('storage.get-yaml.reply', handleYamlReply);
    window.ipcRenderer.off('platform.reply', handlePlatformReply);
});

currentProjectStore.$subscribe(() => {
    loadEnvironmentState();
});
</script>

<template>
    <div class="dropdown dropdown-end">
        <IconButton
            tabindex="0"
            role="button"
            label="Environments"
        >
            <AdjustmentsHorizontalIcon class="size-4" />
        </IconButton>

        <div
            tabindex="0"
            class="dropdown-content mt-2 z-[400] menu p-2 shadow-lg bg-base-200/95 backdrop-blur-xl rounded-xl border border-base-content/10"
        >
            <div class="flex flex-col gap-1.5">
                <button
                    v-for="env in SPECIAL_ENVIRONMENTS_LIST"
                    :key="env.value"
                    @click="toggleEnvironment(env.value)"
                    class="flex items-center gap-3 hover:bg-base-content/5 px-3 py-2 rounded-lg transition-colors text-left"
                    :class="
                        envState[env.value]
                            ? 'text-base-content font-medium'
                            : 'text-base-content/70 hover:text-base-content'
                    "
                >
                    <div class="size-2.5 rounded-full relative flex items-center justify-center">
                        <span
                            v-if="envState[env.value]"
                            class="absolute inline-flex h-full w-full rounded-full bg-success opacity-20"
                        ></span>
                        <span
                            class="relative inline-flex rounded-full size-2 transition-all duration-200"
                            :class="envState[env.value] ? 'bg-success' : 'bg-base-content/20'"
                        ></span>
                    </div>
                    <span class="truncate capitalize text-xs whitespace-nowrap">{{ env.label }}</span>
                </button>

                <div class="my-1 h-px bg-base-content/10"></div>

                <button
                    @click="toggleTailLog()"
                    class="flex items-center gap-3 hover:bg-base-content/5 px-3 py-2 rounded-lg transition-colors text-left"
                    :class="
                        settingsStore.settings.tail_log_enabled
                            ? 'text-base-content font-medium'
                            : 'text-base-content/70 hover:text-base-content'
                    "
                >
                    <div class="size-2.5 rounded-full relative flex items-center justify-center">
                        <span
                            v-if="settingsStore.settings.tail_log_enabled"
                            class="absolute inline-flex h-full w-full rounded-full bg-success opacity-20"
                        ></span>
                        <span
                            class="relative inline-flex rounded-full size-2 transition-all duration-200"
                            :class="settingsStore.settings.tail_log_enabled ? 'bg-success' : 'bg-base-content/20'"
                        ></span>
                    </div>
                    <span class="truncate text-xs whitespace-nowrap">Tail Log</span>
                </button>

                <button
                    v-if="platform === 'darwin'"
                    @click="toggleNotifications()"
                    class="flex items-center gap-3 hover:bg-base-content/5 px-3 py-2 rounded-lg transition-colors text-left"
                    :class="
                        settingsStore.settings.show_dump_notifications
                            ? 'text-base-content font-medium'
                            : 'text-base-content/70 hover:text-base-content'
                    "
                >
                    <div class="size-2.5 rounded-full relative flex items-center justify-center">
                        <span
                            v-if="settingsStore.settings.show_dump_notifications"
                            class="absolute inline-flex h-full w-full rounded-full bg-success opacity-20"
                        ></span>
                        <span
                            class="relative inline-flex rounded-full size-2 transition-all duration-200"
                            :class="
                                settingsStore.settings.show_dump_notifications ? 'bg-success' : 'bg-base-content/20'
                            "
                        ></span>
                    </div>
                    <span class="truncate text-xs whitespace-nowrap">Notifications</span>
                </button>
            </div>
        </div>
    </div>
</template>
