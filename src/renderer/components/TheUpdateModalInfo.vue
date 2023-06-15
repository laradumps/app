<template>
    <div>
        <div class="font-semibold text-lg">✨ LaraDumps Update available!</div>
        <div class="space-y-5">
            <div class="mt-4 select-none">
                <p class="text-sm">There are updates available for LaraDumps App.</p>
            </div>
            <div class="select-none">
                <p>
                    Version: <span class="text-lg font-bold">{{ updateInfo.tag }}</span>
                </p>
                <div
                    class="text-sm italic"
                    v-html="releaseNotes"
                ></div>
                <div class="mt-3">
                    <div v-for="file in updateInfo.files">
                        <div class="mt-1">
                            <button
                                class="mt-2 btn-white cursor-pointer font-semibold"
                                @click="openLink('https://github.com/laradumps/app/releases/download/' + updateInfo.tag + '/' + file.url)"
                            >
                                {{ file.url }}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
    updateInfo: {
        type: Array
    }
});

const openLink = (link) => window.ipcRenderer.send("main:openLink", link);

const releaseNotes = computed(() => {
    return props.updateInfo.releaseNotes.replaceAll("href", "v-href").replace("<h2>What's Changed</h2>", '<div class="font-bold my-3">What\'s Changed</div>');
});
</script>
