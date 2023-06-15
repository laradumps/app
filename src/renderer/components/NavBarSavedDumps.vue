<template>
    <div
        :title="$t('menu.saved_dumps')"
        @click="openSavedDumps"
        class="justify-center cursor-pointer group flex items-center p-2"
    >
        <div>
            <IconSave class="w-3.5 h-3.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200" />
        </div>
    </div>
</template>
<script setup>
import IconSave from "@/components/Icons/IconSave.vue";

const openSavedDumps = () => {
    window.ipcRenderer.send("saved-dumps:show");
};
</script>
