<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { AdjustmentsHorizontalIcon } from '@heroicons/vue/24/outline';
import { useCurrentProject } from '@/store/current-project';
import { SPECIAL_ENVIRONMENTS_LIST } from '@/constants';

const currentProjectStore = useCurrentProject();

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

onMounted(() => {
    loadEnvironmentState();
    window.ipcRenderer.on('storage.get-yaml.reply', handleYamlReply);
});

onUnmounted(() => {
    window.ipcRenderer.off('storage.get-yaml.reply', handleYamlReply);
});

currentProjectStore.$subscribe(() => {
    loadEnvironmentState();
});
</script>

<template>
    <div class="dropdown dropdown-end">
        <button
            tabindex="0"
            role="button"
            title="Environments"
            class="btn btn-ghost btn-circle btn-sm"
        >
            <AdjustmentsHorizontalIcon class="w-4" />
        </button>

        <div
            tabindex="0"
            class="dropdown-content mt-2 z-[400] menu p-2 shadow-[0_10px_40px_rgba(0,0,0,0.5)] bg-base-200/95 backdrop-blur-xl rounded-xl border border-white/5"
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
                            :class="
                                envState[env.value]
                                    ? 'bg-success shadow-[0_0_6px_rgba(34,197,94,0.8)]'
                                    : 'bg-base-content/20'
                            "
                        ></span>
                    </div>
                    <span class="truncate capitalize text-xs whitespace-nowrap">{{ env.label }}</span>
                </button>
            </div>
        </div>
    </div>
</template>
