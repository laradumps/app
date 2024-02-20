<template>
    <div
        :class="{ 'pl-20': menuOpenStore.show, 'pl-3': !menuOpenStore.show }"
        class="fixed flex bg-white dark:bg-base-900 select-none justify-between text-[11px] text-base-600 bottom-0 w-auto right-0 left-0 z-40 p-1.5 dark:text-base-400 dark:dark-base-900 dark:font-normal px-2"
    >
        <span
            >⭐ {{ $t("footer.support_laradumps") }},
            <a
                class="text-blue-500 underline cursor-pointer"
                @click="openLink('https://github.com/laradumps/laradumps')"
            >
                {{ $t("footer.star_out_repository") }}
            </a>
        </span>
        <div class="flex gap-3 mr-1">
            <div class="flex items-center gap-2">
                <input
                    name="hidde-menu"
                    type="checkbox"
                    class="h-4 checkbox"
                    v-model="menuOpenStore.show"
                />
                <label for="hidde-menu">{{ $t("menu.toggle_menu") }}</label>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
import { defineProps, ref, watch } from "vue";
import { useMenuOpenStore } from "@/store/menu-open";

const showMenu = ref(false);
const menuOpenStore = useMenuOpenStore();

const openLink = (value) => {
    window.ipcRenderer.send("main:openLink", value);
};

watch(showMenu, () => {
    menuOpenStore.toggle();
});

defineProps({
    appVersion: {
        type: String,
        default: null
    }
});
</script>
