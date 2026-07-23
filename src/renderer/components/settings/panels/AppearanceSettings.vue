<script setup lang="ts">
import { ref } from 'vue';
import { useSettingsStore } from '@/store/settings';
import { useSettingsSave } from '@/composables/useSettingsSave';
import SettingsRow from '../SettingsRow.vue';
import CustomThemeModal from '../CustomThemeModal.vue';
import SelectInput from '@/components/common/SelectInput.vue';

const settingsStore = useSettingsStore();
const { save } = useSettingsSave();

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

const onBadgeCountChange = () => {
    if (!settingsStore.settings.show_badge_count) {
        window.ipcRenderer.send('badge-icon.increment', { reset: true });
    }
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

        <SettingsRow :label="$t('settings.scroll_direction')">
            <div class="w-52">
                <SelectInput
                    v-model="settingsStore.settings.scroll_direction"
                    @change="save()"
                >
                    <option
                        v-for="(value, key) in settingsStore.scrollDirection"
                        :value="key"
                    >
                        {{ value }}
                    </option>
                </SelectInput>
            </div>
        </SettingsRow>

        <SettingsRow :label="$t('settings.dump_order')">
            <div class="w-52">
                <SelectInput
                    v-model="settingsStore.settings.dump_order"
                    @change="save()"
                >
                    <option
                        v-for="(value, key) in settingsStore.dumpOrder"
                        :value="key"
                    >
                        {{ value }}
                    </option>
                </SelectInput>
            </div>
        </SettingsRow>

        <SettingsRow :label="$t('settings.grouped_by_time')">
            <input
                type="checkbox"
                class="toggle toggle-sm toggle-accent"
                v-model="settingsStore.settings.grouped_by_time"
                @change="save()"
            />
        </SettingsRow>

        <SettingsRow :label="$t('settings.show_context')">
            <input
                type="checkbox"
                class="toggle toggle-sm toggle-accent"
                v-model="settingsStore.settings.show_context"
            />
        </SettingsRow>

        <SettingsRow :label="$t('settings.show_badge_count')">
            <input
                type="checkbox"
                class="toggle toggle-sm toggle-accent"
                v-model="settingsStore.settings.show_badge_count"
                @change="onBadgeCountChange()"
            />
        </SettingsRow>

        <SettingsRow :label="$t('settings.show_dump_notifications')">
            <input
                type="checkbox"
                class="toggle toggle-sm toggle-accent"
                v-model="settingsStore.settings.show_dump_notifications"
                @change="save()"
            />
        </SettingsRow>

        <SettingsRow :label="$t('settings.show_pause_button')">
            <input
                type="checkbox"
                class="toggle toggle-sm toggle-accent"
                v-model="settingsStore.settings.show_pause_button"
            />
        </SettingsRow>

        <SettingsRow :label="$t('settings.show_ssh_button')">
            <input
                type="checkbox"
                class="toggle toggle-sm toggle-accent"
                v-model="settingsStore.settings.show_ssh_button"
            />
        </SettingsRow>

        <SettingsRow :label="$t('settings.show_variable_type')">
            <input
                type="checkbox"
                class="toggle toggle-sm toggle-accent"
                v-model="settingsStore.settings.show_variable_type"
            />
        </SettingsRow>

        <SettingsRow
            :label="$t('settings.show_tips')"
            :divider="blurSupported"
        >
            <input
                type="checkbox"
                class="toggle toggle-sm toggle-accent"
                v-model="settingsStore.settings.show_tips"
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
