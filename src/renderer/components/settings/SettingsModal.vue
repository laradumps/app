<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { toastHost } from '@/composables/useToastHost';
import {
    XMarkIcon,
    Cog6ToothIcon,
    RectangleGroupIcon,
    Bars3Icon,
    KeyIcon,
    CommandLineIcon
} from '@heroicons/vue/24/outline';
import SettingsSidebar, { type SettingsNavItem } from './SettingsSidebar.vue';
import GeneralSettings from './panels/GeneralSettings.vue';
import AppearanceSettings from './panels/AppearanceSettings.vue';
import LimitedDumpsSettings from './panels/LimitedDumpsSettings.vue';
import ShortcutsSettings from './panels/ShortcutsSettings.vue';
import McpSettings from './panels/McpSettings.vue';

const { t } = useI18n();

const dialog = ref<HTMLDialogElement | null>(null);
const toastPortal = ref<HTMLElement | null>(null);
const selected = ref<string>('appearance');

const navItems: SettingsNavItem[] = [
    { id: 'appearance', label: t('settings.appearance'), icon: RectangleGroupIcon },
    { id: 'general', label: t('settings.settings'), icon: Cog6ToothIcon },
    { id: 'limited_dumps', label: t('settings.limited_dumps'), icon: Bars3Icon },
    { id: 'shortcuts', label: t('settings.shortcuts'), icon: KeyIcon },
    { id: 'mcp', label: 'MCP Server', icon: CommandLineIcon }
];

let openObserver: MutationObserver | null = null;

onMounted(() => {
    if (dialog.value) {
        openObserver = new MutationObserver(() => {
            toastHost.value = dialog.value?.open ? toastPortal.value : null;
        });
        openObserver.observe(dialog.value, { attributes: true, attributeFilter: ['open'] });
    }
});

onBeforeUnmount(() => {
    openObserver?.disconnect();
    toastHost.value = null;
});

const open = (tab?: string) => {
    if (tab) selected.value = tab;
    dialog.value?.showModal();
};

const close = () => dialog.value?.close();

defineExpose({ open, close });
</script>

<template>
    <dialog
        ref="dialog"
        id="settings_modal"
        class="modal modal-middle"
    >
        <!-- Top-layer portal so toasts render above the modal while it is open.
             display:contents keeps it out of the modal's flex/grid layout so the
             modal-box stays perfectly centered; teleported toasts are fixed-positioned. -->
        <div
            ref="toastPortal"
            class="contents"
        ></div>

        <div
            class="modal-box w-[860px] max-w-[92vw] h-[600px] max-h-[88vh] p-0 rounded-xl overflow-hidden flex flex-col"
        >
            <div class="flex flex-1 min-h-0">
                <SettingsSidebar
                    v-model="selected"
                    :items="navItems"
                />

                <div class="flex-1 flex flex-col min-h-0">
                    <!-- Top bar with close -->
                    <div class="flex items-center justify-end px-4 pt-3 pb-1 flex-shrink-0">
                        <button
                            @click="close"
                            class="btn btn-ghost btn-circle btn-sm text-base-content/50 hover:text-base-content"
                        >
                            <XMarkIcon class="w-4 h-4" />
                        </button>
                    </div>

                    <!-- Active panel -->
                    <div class="flex-1 overflow-y-auto px-6 pb-4">
                        <GeneralSettings v-if="selected === 'general'" />
                        <AppearanceSettings v-else-if="selected === 'appearance'" />
                        <LimitedDumpsSettings v-else-if="selected === 'limited_dumps'" />
                        <ShortcutsSettings v-else-if="selected === 'shortcuts'" />
                        <McpSettings v-else-if="selected === 'mcp'" />
                    </div>
                </div>
            </div>
        </div>

        <!-- Backdrop -->
        <form
            method="dialog"
            class="modal-backdrop"
        >
            <button>close</button>
        </form>
    </dialog>
</template>
