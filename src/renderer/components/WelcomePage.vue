<template>
    <div>
        <div class="right-0 flex justify-center items-center">
            <div id="output"></div>

            <!-- welcome page -->
            <div class="select-none w-full px-6 text-sm dark:text-slate-300 leading-6">
                <div>
                    <h3 class="mb-8 text-xl font-bold">
                        <span class="text-2xl text-blue-600 dark:text-slate-300 mr-1">👋</span>
                        {{ $t("doc.hello_dev") }},
                    </h3>
                    <span class="font-semibold text-lg">{{ $t("doc.welcome_to_laradumps") }}</span>
                </div>

                <div class="text-xs font-normal min-w-[400px]">
                    <div class="mt-6 text-slate-800 dark:text-slate-400">
                        <span class="text-xs">1. {{ $t("doc.install_laradumps") }}:</span>
                        <span
                            @click="openLink('https://laradumps.dev')"
                            class="text-blue-500 underline cursor-pointer dark:text-blue-300 ml-1"
                            >https://laradumps.dev</span
                        >
                    </div>
                    <div class="mt-5">
                        <span class="text-xs dark:text-slate-400">2. {{ $t("doc.add") }}</span>
                        <span class="ml-2 p-1.5 text-slate-700 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-600 text-sm rounded mr-1 cursor-pointer leading-normal">
                            <button
                                :title="$t('click_to_copy')"
                                @click="$clipboard('ds(\'Hello World\');')"
                            >
                                <div class="flex items-center justify-between dark:text-slate-300">
                                    <span class="text-xs mr-1">ds('Hello world!')</span>
                                    <div>
                                        <ClipboardIcon class="w-4 h-4" />
                                    </div>
                                </div>
                            </button>
                        </span>
                        <span class="text-xs dark:text-slate-400">{{ $t("doc.somewhere_in_your_code") }}</span>
                    </div>
                    <div class="mt-5 text-xs dark:text-slate-400">
                        3.
                        {{ $t("doc.run_your_application_and_see_what_happens_here") }}
                        😎
                    </div>
                </div>
                <div class="mt-8 text-xs font-normal hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-400">
                    📚 {{ $t("doc.check_out_our") }}
                    <span
                        @click="openLink('https://laradumps.dev')"
                        class="text-blue-500 underline cursor-pointer dark:text-blue-300"
                        >{{ $t("doc.documentation") }}</span
                    >
                    {{ $t("doc.for_more_information") }}
                </div>
            </div>
        </div>
        <div class="fixed right-6 bottom-10 w-auto">
            <div class="flex gap-2 justify-center">
                <div v-for="shortcut in globalShortcutList">
                    <span
                        v-if="shortcut.hasOwnProperty('shortcut')"
                        :key="shortcut.alias"
                        class="font-light bg-slate-100 dark:bg-slate-800 dark:text-slate-400 rounded-md p-1 px-2 text-xs"
                        ><strong>{{ $t(shortcut.label) }}</strong
                        >: {{ shortcut.originalValue }}</span
                    >
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ClipboardIcon } from "@heroicons/vue/24/outline";

defineProps({
    globalShortcutList: {
        required: true,
        type: Array
    }
});

const openLink = (value) => {
    window.ipcRenderer.send("main:openLink", value);
};
</script>
