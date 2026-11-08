<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSettingsStore } from '@/store/settings';
import { useSettingsSave } from '@/composables/useSettingsSave';
import SettingsRow from '../SettingsRow.vue';
import CustomThemeModal from '../CustomThemeModal.vue';
import SelectInput from '@/components/common/SelectInput.vue';

const settingsStore = useSettingsStore();
const { save } = useSettingsSave();
const { t } = useI18n();

const layoutOptions = computed(() => [
    { value: 'horizontal', label: t('settings.layout_top'), side: false },
    { value: 'vertical', label: t('settings.layout_side'), side: true }
]);

const customThemeModal = ref<InstanceType<typeof CustomThemeModal> | null>(null);

const platform = process.platform;
const blurSupported = platform === 'darwin' || platform === 'win32';
const isWindows = platform === 'win32';

const saveTheme = async () => {
    if (settingsStore.settings.theme === 'system') {
        await save();
        window.ipcRenderer.send('native-theme');
        return;
    }

    if (settingsStore.settings.theme === 'custom') {
        await save();
        customThemeModal.value?.open();
        return;
    }

    document.documentElement.setAttribute('data-theme', settingsStore.settings.theme);
    await save();
};

const editCustomTheme = () => {
    customThemeModal.value?.open();
};

const saveWindowBlur = async () => {
    if (!settingsStore.settings.window_blur) {
        settingsStore.settings.window_opacity = 100;
        settingsStore.applyWindowBlur(false);
        window.ipcRenderer.send('main:set-window-opacity', 100);
    }
    await settingsStore.update();
    window.ipcRenderer.send('main:relaunch-for-blur');
};

const previewWindowOpacity = () => {
    window.ipcRenderer.send('main:set-window-opacity', settingsStore.settings.window_opacity);
};

const saveWindowOpacity = async () => {
    previewWindowOpacity();
    await settingsStore.update();
};
</script>

<template>
    <div>
        <SettingsRow :label="$t('settings.theme')">
            <div class="flex items-center gap-2 w-52">
                <SelectInput
                    class="flex-1"
                    v-model="settingsStore.settings.theme"
                    @change="saveTheme()"
                >
                    <option
                        v-for="(value, key) in settingsStore.themes"
                        :value="key"
                    >
                        {{ value }}
                    </option>
                </SelectInput>
                <button
                    v-if="settingsStore.settings.theme === 'custom'"
                    type="button"
                    class="btn btn-sm"
                    @click="editCustomTheme()"
                >
                    {{ $t('settings.edit') }}
                </button>
            </div>
        </SettingsRow>

        <SettingsRow
            :label="$t('settings.screen_layout')"
            :hint="$t('settings.hints.screen_layout')"
        >
            <div
                role="radiogroup"
                :aria-label="$t('settings.screen_layout')"
                class="grid grid-cols-2 gap-2 w-64"
            >
                <label
                    v-for="option in layoutOptions"
                    :key="option.value"
                    class="flex flex-col gap-1.5 p-1.5 rounded-lg border cursor-pointer transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary"
                    :class="
                        settingsStore.settings.screen_layout === option.value
                            ? 'border-primary'
                            : 'border-base-300 hover:border-base-content/30'
                    "
                >
                    <input
                        type="radio"
                        name="screen_layout"
                        class="sr-only"
                        :value="option.value"
                        v-model="settingsStore.settings.screen_layout"
                        @change="save()"
                    />
                    <span
                        aria-hidden="true"
                        class="flex h-14 rounded-md overflow-hidden bg-base-300"
                        :class="option.side ? 'flex-row' : 'flex-col'"
                    >
                        <span
                            class="flex gap-1 p-1.5 border-base-content/10"
                            :class="option.side ? 'flex-col border-r' : 'flex-row border-b'"
                        >
                            <span
                                v-for="tab in 3"
                                :key="tab"
                                class="h-1 rounded-sm"
                                :class="[option.side ? 'w-5' : 'w-3', tab === 1 ? 'bg-primary' : 'bg-base-content/30']"
                            ></span>
                        </span>
                        <span class="flex-1 flex flex-col gap-1 p-1.5">
                            <span class="h-1 w-4/5 rounded-sm bg-base-content/15"></span>
                            <span class="h-1 w-3/5 rounded-sm bg-base-content/15"></span>
                            <span class="h-1 w-2/3 rounded-sm bg-base-content/15"></span>
                        </span>
                    </span>
                    <span class="text-xs font-medium">{{ option.label }}</span>
                </label>
            </div>
        </SettingsRow>

        <SettingsRow
            :label="$t('settings.show_screen_icons')"
            :hint="$t('settings.hints.show_screen_icons')"
            :divider="blurSupported"
        >
            <input
                type="checkbox"
                class="toggle toggle-sm toggle-accent"
                :aria-label="$t('settings.show_screen_icons')"
                v-model="settingsStore.settings.show_screen_icons"
                @change="save()"
            />
        </SettingsRow>

        <template v-if="blurSupported">
            <SettingsRow
                :label="$t('settings.window_blur')"
                :hint="isWindows ? $t('settings.window_blur_hint_win') : ''"
            >
                <input
                    type="checkbox"
                    class="toggle toggle-sm toggle-accent"
                    v-model="settingsStore.settings.window_blur"
                    @change="saveWindowBlur()"
                />
            </SettingsRow>

            <template v-if="settingsStore.settings.window_blur">
                <SettingsRow
                    v-if="!isWindows"
                    :label="$t('settings.window_blur_mode')"
                >
                    <div class="w-52">
                        <SelectInput
                            v-model="settingsStore.settings.window_blur_mode"
                            @change="saveWindowBlur()"
                        >
                            <option value="fullscreen-ui">{{ $t('settings.window_blur_mode_glass') }}</option>
                            <option value="hud">{{ $t('settings.window_blur_mode_hud') }}</option>
                            <option value="sidebar">{{ $t('settings.window_blur_mode_sidebar') }}</option>
                            <option value="under-window">{{ $t('settings.window_blur_mode_subtle') }}</option>
                        </SelectInput>
                    </div>
                </SettingsRow>

                <SettingsRow :label="$t('settings.window_blur_opacity')">
                    <div class="flex items-center gap-2 w-52">
                        <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            class="range range-sm range-accent flex-1"
                            v-model.number="settingsStore.settings.window_blur_opacity"
                            @change="save()"
                        />
                        <span class="text-xs w-8 text-right">{{ settingsStore.settings.window_blur_opacity }}%</span>
                    </div>
                </SettingsRow>

                <SettingsRow
                    :label="$t('settings.window_opacity')"
                    :hint="settingsStore.settings.window_opacity < 100 ? $t('settings.window_opacity_hint') : ''"
                    :divider="false"
                >
                    <div class="flex items-center gap-2 w-52">
                        <input
                            type="range"
                            min="30"
                            max="100"
                            step="5"
                            class="range range-sm range-accent flex-1"
                            v-model.number="settingsStore.settings.window_opacity"
                            @input="previewWindowOpacity()"
                            @change="saveWindowOpacity()"
                        />
                        <span class="text-xs w-8 text-right">{{ settingsStore.settings.window_opacity }}%</span>
                    </div>
                </SettingsRow>
            </template>
        </template>

        <CustomThemeModal ref="customThemeModal" />
    </div>
</template>
