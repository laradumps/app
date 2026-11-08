<script setup lang="ts">
import { computed, inject, ref, onMounted, onUnmounted, type Ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { AdjustmentsHorizontalIcon } from '@heroicons/vue/24/outline';
import MenuRow from '@/components/navbar/MenuRow.vue';
import MenuSubpanel from '@/components/navbar/MenuSubpanel.vue';
import { useCurrentProject } from '@/store/current-project';
import { useSettingsStore } from '@/store/settings';
import { SPECIAL_ENVIRONMENTS_LIST } from '@/constants';

const currentProjectStore = useCurrentProject();
const settingsStore = useSettingsStore();
const { t } = useI18n();
const view = inject<Ref<string>>('menuView', ref('root'));

const toggleTailLog = () => {
    settingsStore.settings.tail_log_enabled = !settingsStore.settings.tail_log_enabled;
    settingsStore.update();
};

const envState = ref<Record<string, boolean>>({});

const enabledCount = computed(
    () => Object.values(envState.value).filter(Boolean).length + (settingsStore.settings.tail_log_enabled ? 1 : 0)
);

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
    <MenuRow
        v-show="view === 'root'"
        :label="$t('menu.environments')"
        :value="enabledCount ? t('menu.enabled_count', { n: enabledCount }) : t('menu.off')"
        drill
        data-opens="environments"
        @click="view = 'environments'"
    >
        <AdjustmentsHorizontalIcon class="size-4" />
    </MenuRow>

    <MenuSubpanel
        v-if="view === 'environments'"
        :title="$t('menu.environments')"
    >
        <MenuRow
            v-for="env in SPECIAL_ENVIRONMENTS_LIST"
            :key="env.value"
            toggle
            :label="env.label"
            :model-value="envState[env.value]"
            @update:model-value="toggleEnvironment(env.value)"
        />
        <div class="my-1 h-px bg-base-content/10"></div>
        <MenuRow
            toggle
            :label="$t('menu.tail_log')"
            :model-value="settingsStore.settings.tail_log_enabled"
            @update:model-value="toggleTailLog()"
        />
    </MenuSubpanel>
</template>
