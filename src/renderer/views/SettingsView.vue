<script setup lang="ts">
import Divider from '@/components/common/Divider.vue';
import { nextTick, onMounted, onUpdated, ref, watch } from 'vue';
import { useSettingsStore } from '@/store/settings';
import SelectInput from '@/components/common/SelectInput.vue';
import { useI18n } from 'vue-i18n';
import { useI18nStore } from '@/store/i18n';
import hotkeys from 'hotkeys-js';
import { useToastStore } from '@/store/toast';
import { Cog6ToothIcon, RectangleGroupIcon, Bars3Icon, KeyIcon, CommandLineIcon } from '@heroicons/vue/24/outline';
import { useRoute } from 'vue-router';

const editMode = ref(false);
const selected = ref<string | null>('settings');
const customTheme = ref('');

const mcpServerPath = ref('');
const mcpClient = ref('cursor');
const mcpLogs = ref<string[]>([]);
const activeMcpTab = ref('setup');

const mcpTools = ref([
    { name: 'get_logs', description: 'Get all logs' },
    { name: 'get_log_details', description: 'Get full details of a specific log by ID' },
    { name: 'get_queries', description: 'Get SQL queries' },
    { name: 'get_jobs', description: 'Get jobs' },
    { name: 'get_brains', description: "Get collected 'Brains' data" },
    { name: 'get_dumps', description: 'Get all dumps' },
    { name: 'get_project_info', description: 'Get current project information' },
    { name: 'get_mails', description: 'Get all emails' },
    { name: 'get_livewire_components', description: 'Get all Livewire components' },
    { name: 'search_dumps', description: 'Search across all dumps, queries, logs, and mails' },
    { name: 'analyze_last_exception', description: 'Analyze the most recent exception or error log (Prompt)' },
    { name: 'summarize_logs', description: 'Summarize the recent application logs (Prompt)' },
    { name: 'optimize_latest_query', description: 'Analyze and optimize the latest SQL query (Prompt)' }
]);

const mcpActions = ref([
    { name: 'clear_dumps', description: 'Clears all dumps' },
    { name: 'clear_jobs', description: 'Clears all jobs' },
    { name: 'clear_mails', description: 'Clears all emails' },
    { name: 'clear_logs', description: 'Clears all logs' },
    { name: 'confetti', description: 'Fires a confetti animation on the main application screen' },
    {
        name: 'toggle_env',
        description:
            'Enable, disable or toggle a environment/watcher (e.g. queries, logs, cache, jobs, etc) for the current project.'
    }
]);

const settingsStore = useSettingsStore();
const toast = useToastStore();

const i18n = useI18n();
const { locale } = useI18n({ useScope: 'global' });
const localeStore = useI18nStore();
const route = useRoute();

onMounted(async () => {
    if (route.query.tab) {
        selected.value = route.query.tab as string;
    }
    customTheme.value = settingsStore.settings.custom_css;
    mcpServerPath.value = await window.ipcRenderer.invoke('get-mcp-server-path');

    window.ipcRenderer.on('mcp:log', (event, log: string) => {
        mcpLogs.value.push(log);
        // Keep only the last 50 logs to avoid memory issues
        if (mcpLogs.value.length > 50) {
            mcpLogs.value.shift();
        }
    });
});

const copyMcpCommand = (command: string) => {
    console.log('Copied command:', command);
    navigator.clipboard.writeText(command);
    toast.show('Command copied to clipboard', 'success');
};

const copyMcpConfig = () => {
    let config: {};

    if (mcpClient.value === 'cursor') {
        config = {
            mcpServers: {
                laradumps: {
                    url: `http://127.0.0.1:${settingsStore.settings.mcp_port}/sse`,
                    type: 'sse'
                }
            }
        };
    } else {
        config = {
            $schema: 'https://opencode.ai/config.json',
            mcp: {
                LaraDumps: {
                    type: 'remote',
                    url: `http://127.0.0.1:${settingsStore.settings.mcp_port}/sse`
                }
            }
        };
    }

    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    toast.show('Config JSON copied to clipboard', 'success');
};

const saveMcpSettings = async () => {
    await nextTick(() => saveSettings());
    window.ipcRenderer.send('mcp:restart');
};

onUpdated(() => {
    if (selected.value === 'shortcuts') {
        getSavedLocalShortcuts();

        nextTick(() => {
            detectHotKeysPress();
        });
    }
});

const saveSettings = async () => {
    await settingsStore.update();

    toast.show(i18n.t('settings.changes_saved'), 'success');
};

const saveTheme = async () => {
    if (settingsStore.settings.theme === 'system') {
        await nextTick(() => saveSettings());
        window.ipcRenderer.send('native-theme');

        return;
    }

    if (settingsStore.settings.theme === 'custom') {
        await nextTick(() => saveSettings());

        modal_custom_theme.showModal();
        return;
    }

    document.documentElement.setAttribute('data-theme', settingsStore.settings.theme);
    await nextTick(() => saveSettings());
};

const saveLanguage = async () => {
    localeStore.set(settingsStore.settings.language);
    locale.value = localeStore.value;

    await nextTick(() => saveSettings());
};

const saveIDEHandler = async () => {
    await nextTick(() => saveSettings());
};

const saveCheckForUpdates = async () => {
    await nextTick(() => saveSettings());
};

const saveAutoLaunch = async () => {
    window.ipcRenderer.send('set-auto-launch', { value: settingsStore.settings.auto_launch });

    await nextTick(() => saveSettings());
};

const saveScrollDirection = async () => {
    await nextTick(() => saveSettings());
};

const saveReverse = async () => {
    await nextTick(() => saveSettings());
};

const saveGroupedByTime = async () => {
    await nextTick(() => saveSettings());
};

const saveLimitDumps = async () => {
    await nextTick(() => saveSettings());
};

const getSavedLocalShortcuts = () => {
    window.ipcRenderer.send('local-shortcut:get');

    window.ipcRenderer.on('app:local-shortcut::list', (arg, shortcuts) => {
        shortcuts.forEach((shortcuts) => {
            if (shortcuts.hasOwnProperty('shortcut')) {
                const shortcut = shortcuts.shortcut.replace('ds_shortcut_', '');

                try {
                    if (document.getElementById(shortcut) !== null) {
                        document.getElementById(shortcut).value = shortcuts.keys.beautifyShortcut();
                    }
                } catch (err) {
                    console.log('Error: ', err);
                }
            }
        });
    });
};

const detectHotKeysPress = () => {
    let inputElements = null;

    const shortCutAll = [...document.getElementsByClassName('js-shortcut')];

    shortCutAll.forEach((input) =>
        input.addEventListener(
            'click',
            (event) => {
                inputElements = event.target;
            },
            false
        )
    );

    shortCutAll.forEach((input) =>
        input.addEventListener(
            'blur',
            () => {
                inputElements = null;
            },
            false
        )
    );

    //* * Detected key pressed **/
    hotkeys('*', () => {
        const keys = hotkeys.getPressedKeyString().join('+');

        if (typeof inputElements !== 'undefined' && inputElements !== null) {
            inputElements.value = keys.beautifyShortcut();
        }
    });
};

const saveShortcuts = async () => {
    document.querySelectorAll('.js-shortcut').forEach((element) => {
        if (element.value.toString() !== '') {
            const shortcut = {
                label: element.dataset.label,
                originalValue: element.value,
                keys: element.value.toElectronFormat()
            };

            settingsStore.settings.shortcuts[element.name] = shortcut;

            window.ipcRenderer.send('local-shortcut:set', shortcut);
        }
    });

    await saveSettings();

    window.ipcRenderer.send('settings.init-shortcuts');

    alert(i18n.t('settings.shortcut.save_message'));

    editMode.value = false;
};

watch(settingsStore.settings, async (value) => {
    if (!settingsStore.settings.show_badge_count) {
        window.ipcRenderer.send('badge-icon.increment', {
            reset: true
        });
    }
});

const editShortcut = () => {
    editMode.value = true;

    window.ipcRenderer.send('settings.clear-shortcuts', {});
};

const openThemeGenerator = () => {
    window.ipcRenderer.send('main:openLink', 'https://daisyui.com/theme-generator');
};

const saveCustomTheme = async () => {
    settingsStore.settings.custom_css = customTheme.value.replace(
        /@plugin.*?{([\s\S]*?)}/g,
        `[data-theme="custom"] { $1 }`
    );
    settingsStore.settings.theme = 'custom';

    await nextTick(async () => {
        await saveSettings();

        window.ipcRenderer.send('reload');
    });
};
</script>

<template>
    <div class="overflow-auto text-base-content">
        <dialog
            id="modal_custom_theme"
            class="modal modal-middle"
        >
            <div class="modal-box">
                <h3 class="text-lg font-bold">{{ $t('settings.custom_theme') }}</h3>
                <fieldset class="fieldset w-full">
                    <legend class="fieldset-legend">{{ $t('settings.custom_theme_message') }}</legend>

                    <span
                        @click="openThemeGenerator"
                        class="cursor-pointer link fieldset-label"
                        >https://daisyui.com/theme-generator</span
                    >

                    <textarea
                        class="textarea rounded-lg h-80 w-full"
                        v-model="customTheme"
                    >
                    </textarea>
                </fieldset>
                <div class="modal-action">
                    <form
                        method="dialog"
                        class="flex gap-3"
                    >
                        <button class="btn btn-sm">{{ $t('settings.close') }}</button>

                        <button
                            @click="saveCustomTheme"
                            type="button"
                            class="btn btn-sm btn-primary"
                        >
                            {{ $t('settings.save') }}
                        </button>
                    </form>
                </div>
            </div>
        </dialog>

        <div class="mx-auto p-3 pr-5 text-sm">
            <div class="flex gap-3">
                <ul class="menu menu-md bg-base-200 w-40 rounded-box">
                    <li>
                        <span
                            @click="selected = 'settings'"
                            :class="{ 'menu-active': selected === 'settings' }"
                            class="whitespace-nowrap flex items-center gap-2"
                        >
                            <Cog6ToothIcon class="w-4 h-4" />
                            <span>{{ $t('settings.settings') }}</span>
                        </span>
                    </li>
                    <li>
                        <span
                            @click="selected = 'appearance'"
                            :class="{ 'menu-active': selected === 'appearance' }"
                            class="whitespace-nowrap flex items-center gap-2"
                        >
                            <RectangleGroupIcon class="w-4 h-4" />
                            <span>{{ $t('settings.appearance') }}</span>
                        </span>
                    </li>
                    <li>
                        <span
                            @click="selected = 'limited_dumps'"
                            :class="{ 'menu-active': selected === 'limited_dumps' }"
                            class="whitespace-nowrap flex items-center gap-2"
                        >
                            <Bars3Icon class="w-4 h-4" />
                            <span>{{ $t('settings.limited_dumps') }}</span>
                        </span>
                    </li>
                    <li>
                        <span
                            @click="selected = 'shortcuts'"
                            :class="{ 'menu-active': selected === 'shortcuts' }"
                            class="whitespace-nowrap flex items-center gap-2"
                        >
                            <KeyIcon class="w-4 h-4" />
                            <span>{{ $t('settings.shortcuts') }}</span>
                        </span>
                    </li>
                    <li>
                        <span
                            @click="selected = 'mcp'"
                            :class="{ 'menu-active': selected === 'mcp' }"
                            class="whitespace-nowrap flex items-center gap-2"
                        >
                            <CommandLineIcon class="w-4 h-4" />
                            <span>MCP Server</span>
                        </span>
                    </li>
                </ul>

                <div class="flex-1 min-h-0">
                    <div
                        v-if="selected === 'settings'"
                        class="overflow-auto"
                    >
                        <div class="mt-2 grid grid-cols-2 items-center">
                            <div>{{ $t('settings.app_version') }}</div>
                            <div class="text-right">
                                {{ settingsStore.settings.version ?? '-' }}
                            </div>
                        </div>

                        <Divider class="mt-2" />
                        <div class="mt-2 grid grid-cols-2 items-center">
                            <div>{{ $t('settings.language') }}</div>
                            <div class="flex items-center justify-between">
                                <SelectInput
                                    id="theme"
                                    v-model="settingsStore.settings.language"
                                    @change="saveLanguage()"
                                    :placeholder="$t('settings.select_language')"
                                    class="w-full select-sm"
                                >
                                    <option
                                        v-for="(value, key) in settingsStore.languageOptions"
                                        :value="key"
                                    >
                                        {{ value }}
                                    </option>
                                </SelectInput>
                            </div>
                        </div>

                        <Divider class="mt-2" />
                        <div class="mt-2 grid grid-cols-2 items-center">
                            <div>{{ $t('settings.ide_handler') }}</div>
                            <div class="flex items-center justify-between">
                                <SelectInput
                                    id="theme"
                                    v-model="settingsStore.settings.ide_handler"
                                    @change="saveIDEHandler()"
                                    :placeholder="$t('settings.select_ide_handler')"
                                    class="w-full select-sm"
                                >
                                    <option
                                        v-for="(value, key) in settingsStore.ideHandlerOptions"
                                        :value="key"
                                    >
                                        {{ value }}
                                    </option>
                                </SelectInput>
                            </div>
                        </div>

                        <Divider class="mt-2" />
                        <div class="mt-2 grid grid-cols-2 items-center">
                            <div>{{ $t('settings.check_for_updates') }}</div>
                            <div class="flex items-center justify-between">
                                <SelectInput
                                    id="theme"
                                    v-model="settingsStore.settings.check_for_updates"
                                    @change="saveCheckForUpdates()"
                                    :placeholder="$t('settings.check_for_updates')"
                                    class="w-full select-sm"
                                >
                                    <option
                                        v-for="(value, key) in settingsStore.checkForUpdateOptions"
                                        :value="key"
                                    >
                                        {{ value }}
                                    </option>
                                </SelectInput>
                            </div>
                        </div>

                        <Divider class="mt-2" />
                        <div class="mt-2 grid grid-cols-2 items-center">
                            <div>{{ $t('settings.auto_launch') }}</div>
                            <div class="flex items-center justify-between">
                                <SelectInput
                                    id="theme"
                                    v-model="settingsStore.settings.auto_launch"
                                    @change="saveAutoLaunch()"
                                    :placeholder="$t('settings.auto_launch')"
                                    class="w-full select-sm"
                                >
                                    <option
                                        v-for="(value, key) in settingsStore.autoLaunchOptions"
                                        :value="key"
                                    >
                                        {{ value }}
                                    </option>
                                </SelectInput>
                            </div>
                        </div>
                    </div>

                    <div
                        v-if="selected === 'appearance'"
                        class="overflow-auto"
                    >
                        <div class="mt-2 grid grid-cols-2 items-center">
                            <div>{{ $t('settings.theme') }}</div>
                            <div class="flex items-center justify-between">
                                <SelectInput
                                    id="theme"
                                    v-model="settingsStore.settings.theme"
                                    @change="saveTheme()"
                                    :placeholder="$t('settings.select_theme')"
                                    class="w-full select-sm"
                                >
                                    <option
                                        v-for="(value, key) in settingsStore.themes"
                                        :value="key"
                                    >
                                        {{ value }}
                                    </option>
                                </SelectInput>
                            </div>
                        </div>

                        <Divider class="mt-2" />
                        <div class="mt-2 grid grid-cols-2 items-center">
                            <div>{{ $t('settings.scroll_direction') }}</div>
                            <div class="flex items-center justify-between">
                                <SelectInput
                                    id="scroll"
                                    v-model="settingsStore.settings.scroll_direction"
                                    @change="saveScrollDirection()"
                                    :placeholder="$t('settings.scroll_direction')"
                                    class="w-full select-sm"
                                >
                                    <option
                                        v-for="(value, key) in settingsStore.scrollDirection"
                                        :value="key"
                                    >
                                        {{ value }}
                                    </option>
                                </SelectInput>
                            </div>
                        </div>

                        <Divider class="mt-2" />
                        <div class="mt-2 grid grid-cols-2 items-center">
                            <div>{{ $t('settings.dump_order') }}</div>
                            <div class="flex items-center justify-between">
                                <SelectInput
                                    id="scroll"
                                    v-model="settingsStore.settings.dump_order"
                                    @change="saveReverse()"
                                    :placeholder="$t('settings.dump_order')"
                                    class="w-full select-sm"
                                >
                                    <option
                                        v-for="(value, key) in settingsStore.dumpOrder"
                                        :value="key"
                                    >
                                        {{ value }}
                                    </option>
                                </SelectInput>
                            </div>
                        </div>

                        <Divider class="mt-2" />
                        <div class="mt-2 grid grid-cols-2 items-center">
                            <div>{{ $t('settings.grouped_by_time') }}</div>
                            <div class="flex items-center justify-end">
                                <div class="p-1.5">
                                    <input
                                        type="checkbox"
                                        class="toggle toggle-sm toggle-accent"
                                        v-model="settingsStore.settings.grouped_by_time"
                                        @change="saveGroupedByTime()"
                                    />
                                </div>
                            </div>
                        </div>

                        <Divider class="mt-2" />
                        <div class="mt-2 grid grid-cols-2 items-center">
                            <div>{{ $t('settings.show_context') }}</div>
                            <div class="flex items-center justify-end">
                                <div class="p-1.5">
                                    <input
                                        type="checkbox"
                                        class="toggle toggle-sm toggle-accent"
                                        v-model="settingsStore.settings.show_context"
                                    />
                                </div>
                            </div>
                        </div>

                        <Divider class="mt-2" />
                        <div class="mt-2 grid grid-cols-2 items-center">
                            <div>{{ $t('settings.show_badge_count') }}</div>
                            <div class="flex items-center justify-end">
                                <div class="p-1.5">
                                    <input
                                        type="checkbox"
                                        class="toggle toggle-sm toggle-accent"
                                        v-model="settingsStore.settings.show_badge_count"
                                    />
                                </div>
                            </div>
                        </div>

                        <Divider class="mt-2" />
                        <div class="mt-2 grid grid-cols-2 items-center">
                            <div>{{ $t('settings.show_collapse_button') }}</div>
                            <div class="flex items-center justify-end">
                                <div class="p-1.5">
                                    <input
                                        type="checkbox"
                                        class="toggle toggle-sm toggle-accent"
                                        v-model="settingsStore.settings.show_collapse_button"
                                    />
                                </div>
                            </div>
                        </div>

                        <Divider class="mt-2" />
                        <div class="mt-2 grid grid-cols-2 items-center">
                            <div>{{ $t('settings.show_pause_button') }}</div>
                            <div class="flex items-center justify-end">
                                <div class="p-1.5">
                                    <input
                                        type="checkbox"
                                        class="toggle toggle-sm toggle-accent"
                                        v-model="settingsStore.settings.show_pause_button"
                                    />
                                </div>
                            </div>
                        </div>

                        <Divider class="mt-2" />
                        <div class="mt-2 grid grid-cols-2 items-center">
                            <div>{{ $t('settings.show_ssh_button') }}</div>
                            <div class="flex items-center justify-end">
                                <div class="p-1.5">
                                    <input
                                        type="checkbox"
                                        class="toggle toggle-sm toggle-accent"
                                        v-model="settingsStore.settings.show_ssh_button"
                                    />
                                </div>
                            </div>
                        </div>

                        <Divider class="mt-2" />
                        <div class="mt-2 grid grid-cols-2 items-center">
                            <div>{{ $t('settings.show_variable_type') }}</div>
                            <div class="flex items-center justify-end">
                                <div class="p-1.5">
                                    <input
                                        type="checkbox"
                                        class="toggle toggle-sm toggle-accent"
                                        v-model="settingsStore.settings.show_variable_type"
                                    />
                                </div>
                            </div>
                        </div>

                        <Divider class="mt-2" />
                        <div class="mt-2 grid grid-cols-2 items-center">
                            <div>{{ $t('settings.show_tips') }}</div>
                            <div class="flex items-center justify-end">
                                <div class="p-1.5">
                                    <input
                                        type="checkbox"
                                        class="toggle toggle-sm toggle-accent"
                                        v-model="settingsStore.settings.show_tips"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div
                        v-if="selected === 'limited_dumps'"
                        class="overflow-auto"
                    >
                        <div class="mt-2 grid grid-cols-2 items-center">
                            <div>{{ $t('settings.dumps') }}</div>
                            <div class="flex items-center justify-between">
                                <input
                                    type="number"
                                    class="input input-bordered input-sm w-full"
                                    v-model="settingsStore.settings.limit_dumps"
                                    @change="saveLimitDumps()"
                                />
                            </div>
                        </div>

                        <Divider class="mt-2" />
                        <div class="mt-2 grid grid-cols-2 items-center">
                            <div>{{ $t('settings.laravel_queries') }}</div>
                            <div class="flex items-center justify-between">
                                <input
                                    type="number"
                                    class="input input-bordered input-sm w-full"
                                    v-model="settingsStore.settings.limit_laravel_queries"
                                    @change="saveLimitDumps()"
                                />
                            </div>
                        </div>

                        <Divider class="mt-2" />
                        <div class="mt-2 grid grid-cols-2 items-center">
                            <div>{{ $t('settings.laravel_logs') }}</div>
                            <div class="flex items-center justify-between">
                                <input
                                    type="number"
                                    class="input input-bordered input-sm w-full"
                                    v-model="settingsStore.settings.limit_laravel_logs"
                                    @change="saveLimitDumps()"
                                />
                            </div>
                        </div>

                        <Divider class="mt-2" />
                        <div class="mt-2 grid grid-cols-2 items-center">
                            <div>{{ $t('settings.laravel_jobs') }}</div>
                            <div class="flex items-center justify-between">
                                <input
                                    type="number"
                                    class="input input-bordered input-sm w-full"
                                    v-model="settingsStore.settings.limit_laravel_jobs"
                                    @change="saveLimitDumps()"
                                />
                            </div>
                        </div>
                    </div>

                    <div
                        v-if="selected === 'shortcuts'"
                        class="overflow-auto"
                    >
                        <div
                            v-for="(shortcut, key) in settingsStore.settings.shortcuts"
                            :key="key"
                            class="mt-2 grid grid-cols-2 items-center"
                        >
                            <div>{{ $t(shortcut.label) }}</div>
                            <div class="flex items-center justify-between">
                                <input
                                    type="text"
                                    :disabled="!editMode"
                                    readonly
                                    :placeholder="editMode ? $t('settings.shortcut_placeholder') : ''"
                                    :name="key"
                                    :data-label="shortcut.label"
                                    :id="key"
                                    class="js-shortcut disabled:text-base-content/80 input input-bordered input-sm w-full"
                                    :value="shortcut.originalValue"
                                />
                            </div>
                        </div>

                        <div class="mt-4 flex gap-2 justify-end">
                            <button
                                @click="editShortcut"
                                type="button"
                                class="btn btn-sm btn-ghost"
                            >
                                {{ $t('settings.edit') }}
                            </button>

                            <button
                                @click="saveShortcuts"
                                type="button"
                                class="btn btn-sm btn-primary"
                            >
                                {{ $t('settings.save') }}
                            </button>
                        </div>
                    </div>

                    <div
                        v-if="selected === 'mcp'"
                        class="space-y-3"
                    >
                        <div class="flex flex-col gap-2">
                            <h3 class="text-lg font-bold">MCP Server</h3>
                        </div>

                        <div
                            role="tablist"
                            class="tabs tabs-box bg-base-200/50 !px-0"
                        >
                            <input
                                type="radio"
                                name="mcp_tabs"
                                class="tab"
                                aria-label="Setup"
                                :checked="activeMcpTab === 'setup'"
                                @click="activeMcpTab = 'setup'"
                            />
                            <input
                                type="radio"
                                name="mcp_tabs"
                                class="tab"
                                aria-label="Advanced"
                                :checked="activeMcpTab === 'advanced'"
                                @click="activeMcpTab = 'advanced'"
                            />
                            <input
                                type="radio"
                                name="mcp_tabs"
                                class="tab"
                                aria-label="Tools"
                                :checked="activeMcpTab === 'tools'"
                                @click="activeMcpTab = 'tools'"
                            />
                        </div>

                        <div
                            v-if="activeMcpTab === 'setup'"
                            class="flex flex-col gap-2"
                        >
                            <fieldset class="fieldset bg-base-100 border border-base-300 p-4 rounded-box">
                                <label class="fieldset-label justify-between cursor-pointer w-full">
                                    <span class="text-base font-bold text-base-content">Enable MCP Server</span>
                                    <input
                                        type="checkbox"
                                        class="toggle toggle-primary"
                                        v-model="settingsStore.settings.mcp_enabled"
                                        @change="saveMcpSettings"
                                    />
                                </label>
                                <p class="text-xs opacity-70 mt-2">
                                    Automatically start the MCP server in HTTP mode when LaraDumps launches.
                                </p>
                            </fieldset>

                            <fieldset
                                class="fieldset w-fit"
                                :class="{ 'opacity-50 pointer-events-none': !settingsStore.settings.mcp_enabled }"
                            >
                                <legend class="fieldset-legend">Port</legend>
                                <input
                                    type="number"
                                    class="input input-sm w-24"
                                    v-model="settingsStore.settings.mcp_port"
                                    @change="saveMcpSettings"
                                    placeholder="3002"
                                />
                            </fieldset>

                            <fieldset
                                class="fieldset w-fit"
                                :class="{ 'opacity-50 pointer-events-none': !settingsStore.settings.mcp_enabled }"
                            >
                                <legend class="fieldset-legend">Limit Payload objects</legend>
                                <div
                                    class="tooltip"
                                    data-tip="Max number of items returned to AI (logs, queries, etc)"
                                >
                                    <input
                                        type="number"
                                        class="input input-sm w-24"
                                        v-model="settingsStore.settings.mcp_limit_payload_objects"
                                        @change="saveMcpSettings"
                                        placeholder="300"
                                    />
                                </div>
                            </fieldset>

                            <fieldset class="fieldset">
                                <legend class="fieldset-legend">Configuration</legend>

                                <div class="tabs tabs-box mb-2">
                                    <input
                                        type="radio"
                                        name="mcp_conf_tabs"
                                        class="tab"
                                        aria-label="Cursor"
                                        :checked="mcpClient === 'cursor'"
                                        @click="mcpClient = 'cursor'"
                                    />
                                    <input
                                        type="radio"
                                        name="mcp_conf_tabs"
                                        class="tab"
                                        aria-label="OpenCode"
                                        :checked="mcpClient === 'opencode'"
                                        @click="mcpClient = 'opencode'"
                                    />
                                </div>

                                <div class="mockup-code w-full shadow-sm bg-base-300 text-sm">
                                    <pre v-if="mcpClient === 'cursor'"><code>{
      "mcpServers": {
        "LaraDumps": {
           "url": "http://127.0.0.1:{{ settingsStore.settings.mcp_port }}/sse",
           "type": "sse"
        }
      }
  }</code></pre>
                                    <pre v-if="mcpClient === 'opencode'"><code>{
      "$schema": "https://opencode.ai/config.json",
      "mcp": {
        "LaraDumps": {
           "type": "remote",
           "url": "http://127.0.0.1:{{ settingsStore.settings.mcp_port }}/sse"
        }
      }
  }</code></pre>
                                    <button
                                        class="btn btn-xs btn-ghost absolute top-2 right-2"
                                        @click="copyMcpConfig"
                                    >
                                        Copy JSON
                                    </button>
                                </div>
                            </fieldset>
                        </div>

                        <div
                            v-if="activeMcpTab === 'tools'"
                            class="flex flex-col gap-3"
                        >
                            <div class="flex flex-col gap-2">
                                <h3 class="font-bold text-sm">Data Retrieval & Analysis</h3>
                                <div class="overflow-x-auto border border-base-300 rounded-lg">
                                    <table class="table table-sm table-zebra">
                                        <thead>
                                            <tr class="bg-base-200">
                                                <th>Tool Name</th>
                                                <th>Description</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr
                                                v-for="tool in mcpTools"
                                                :key="tool.name"
                                            >
                                                <td class="font-mono text-xs font-bold">{{ tool.name }}</td>
                                                <td class="text-xs">{{ tool.description }}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div class="flex flex-col gap-2">
                                <h3 class="font-bold text-sm">Actions</h3>
                                <div class="overflow-x-auto border border-base-300 rounded-lg">
                                    <table class="table table-sm table-zebra">
                                        <thead>
                                            <tr class="bg-base-200">
                                                <th>Action Name</th>
                                                <th>Description</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr
                                                v-for="action in mcpActions"
                                                :key="action.name"
                                            >
                                                <td class="font-mono text-xs font-bold">{{ action.name }}</td>
                                                <td class="text-xs">{{ action.description }}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <div
                            v-if="activeMcpTab === 'advanced'"
                            class="flex flex-col gap-3"
                        >
                            <fieldset class="fieldset">
                                <legend class="fieldset-legend">Stdio Command</legend>
                                <div class="join w-full">
                                    <input
                                        type="text"
                                        class="input input-sm join-item w-full font-mono bg-base-100"
                                        :value="`node ${mcpServerPath}`"
                                        readonly
                                    />
                                    <button
                                        class="btn btn-sm btn-neutral join-item"
                                        @click="copyMcpCommand(`node ${mcpServerPath}`)"
                                    >
                                        Copy
                                    </button>
                                </div>
                            </fieldset>

                            <fieldset class="fieldset">
                                <legend class="fieldset-legend">Server Logs</legend>
                                <div class="mockup-code bg-base-300 h-64 overflow-y-auto w-full text-xs shadow-sm">
                                    <pre
                                        v-for="(log, index) in mcpLogs"
                                        :key="index"
                                        :class="{ 'text-error': log.includes('[error]') }"
                                    ><code>{{ log }}</code></pre>
                                    <pre
                                        v-if="mcpLogs.length === 0"
                                        class="opacity-50"
                                    ><code>Waiting for logs...</code></pre>
                                </div>
                            </fieldset>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
