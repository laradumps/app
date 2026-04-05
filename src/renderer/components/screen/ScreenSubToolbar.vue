<script setup lang="ts">
import { computed } from 'vue';

interface YamlControl {
    key: string;
    label: string;
    enabled: boolean;
    section: string;
}

const props = defineProps<{
    screenType: string;
    yamlConfig?: Record<string, any>;
}>();

const emit = defineEmits<{
    (e: 'config-changed', section: string, key: string, value: boolean): void;
}>();

const controls = computed((): YamlControl[] => {
    if (!props.yamlConfig) return [];

    switch (props.screenType) {
        case 'queries':
            const queryControls: YamlControl[] = [];

            if (props.yamlConfig.queries) {
                queryControls.push({
                    key: 'explain',
                    label: 'Explain Queries',
                    enabled: props.yamlConfig.queries.explain === true,
                    section: 'queries'
                });
            }

            return queryControls;

        case 'logs':
            const logConfig = props.yamlConfig.logs || {};
            return [
                { key: 'info', label: 'Info', enabled: logConfig.info === true, section: 'logs' },
                { key: 'debug', label: 'Debug', enabled: logConfig.debug === true, section: 'logs' },
                { key: 'error', label: 'Error', enabled: logConfig.error === true, section: 'logs' },
                { key: 'warning', label: 'Warning', enabled: logConfig.warning === true, section: 'logs' },
                { key: 'critical', label: 'Critical', enabled: logConfig.critical === true, section: 'logs' },
                { key: 'alert', label: 'Alert', enabled: logConfig.alert === true, section: 'logs' },
                { key: 'emergency', label: 'Emergency', enabled: logConfig.emergency === true, section: 'logs' },
                { key: 'notice', label: 'Notice', enabled: logConfig.notice === true, section: 'logs' },
                { key: 'vendor', label: 'Vendor', enabled: logConfig.vendor === true, section: 'logs' },
                {
                    key: 'deprecated_message',
                    label: 'Deprecated',
                    enabled: logConfig.deprecated_message === true,
                    section: 'logs'
                },
                { key: 'boost_info', label: 'Boost Info', enabled: logConfig.boost_info === true, section: 'logs' }
            ];

        default:
            return [];
    }
});

const toggleControl = (control: YamlControl) => {
    const newValue = !control.enabled;
    emit('config-changed', control.section, control.key, newValue);
};

// Formata nome removendo underscores e capitalize
const formattedName = (name: string): string =>
    name?.replace(/[-_.]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) || '';
</script>

<template>
    <div
        v-if="controls.length > 0"
        class="bg-base-100 border-b border-base-200 px-4 py-2"
    >
        <div class="flex items-center gap-2 flex-wrap">
            <span class="text-xs font-medium text-base-content/60 mr-2">Configure:</span>
            <button
                v-for="control in controls"
                :key="control.key"
                @click="toggleControl(control)"
                class="btn btn-xs transition-colors"
                :class="{
                    'btn-success': control.enabled,
                    'btn-ghost': !control.enabled
                }"
                :title="`Toggle ${control.label}: ${control.enabled ? 'Enabled' : 'Disabled'}`"
            >
                <span class="text-[10px] mr-1">{{ control.enabled ? '●' : '○' }}</span>
                {{ control.label }}
            </button>
        </div>
    </div>
</template>
