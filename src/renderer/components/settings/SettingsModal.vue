<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { toastHost } from '@/composables/useToastHost';
import {
    XMarkIcon,
    Cog6ToothIcon,
    RectangleGroupIcon,
    InboxStackIcon,
    EyeIcon,
    BellIcon,
    PuzzlePieceIcon,
    KeyIcon,
    CommandLineIcon
} from '@heroicons/vue/24/outline';
import SettingsSidebar, { type SettingsNavItem } from './SettingsSidebar.vue';
import GeneralSettings from './panels/GeneralSettings.vue';
import AppearanceSettings from './panels/AppearanceSettings.vue';
import LimitedDumpsSettings from './panels/LimitedDumpsSettings.vue';
import ReadingSettings from './panels/ReadingSettings.vue';
import NotificationSettings from './panels/NotificationSettings.vue';
import IntegrationSettings from './panels/IntegrationSettings.vue';
import ShortcutsSettings from './panels/ShortcutsSettings.vue';
import McpSettings from './panels/McpSettings.vue';

const { t } = useI18n();

const dialog = ref<HTMLDialogElement | null>(null);
const toastPortal = ref<HTMLElement | null>(null);
const selected = ref<string>('capture');

const navItems = computed<SettingsNavItem[]>(() =>
    (
        [
            ['capture', InboxStackIcon],
            ['reading', EyeIcon],
            ['appearance', RectangleGroupIcon],
            ['notifications', BellIcon],
            ['integrations', PuzzlePieceIcon],
            ['mcp', CommandLineIcon],
            ['shortcuts', KeyIcon],
            ['app', Cog6ToothIcon]
        ] as const
    ).map(([id, icon]) => ({
        id,
        icon,
        label: t(`settings.sections.${id}`),
        sub: t(`settings.sections.${id}_sub`)
    }))
);

const current = computed(() => navItems.value.find((item) => item.id === selected.value));

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
                    <div class="flex items-start gap-3 px-6 pt-4 pb-2 flex-shrink-0">
                        <div class="min-w-0 flex-1">
                            <h2 class="text-base font-semibold">{{ current?.label }}</h2>
                            <p class="text-xs text-base-content/50">{{ current?.sub }}</p>
                        </div>
                        <button
                            @click="close"
                            :aria-label="$t('settings.close')"
                            class="btn btn-ghost btn-circle btn-sm text-base-content/50 hover:text-base-content -mr-2"
                        >
                            <XMarkIcon class="w-4 h-4" />
                        </button>
                    </div>

                    <!-- Active panel -->
                    <div class="flex-1 overflow-y-auto px-6 pb-4">
                        <LimitedDumpsSettings v-if="selected === 'capture'" />
                        <ReadingSettings v-else-if="selected === 'reading'" />
                        <AppearanceSettings v-else-if="selected === 'appearance'" />
                        <NotificationSettings v-else-if="selected === 'notifications'" />
                        <IntegrationSettings v-else-if="selected === 'integrations'" />
                        <GeneralSettings v-else-if="selected === 'app'" />
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
