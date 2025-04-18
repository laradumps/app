<script setup>
import { onMounted, ref } from "vue";
import { CogIcon, HomeIcon } from "@heroicons/vue/24/outline";
import router from "../router";
import { useXDebug } from "@/store/xdebug";

const xDebugStore = useXDebug();

const inSettingPage = ref(false);

const togglePage = () => {
    inSettingPage.value = !inSettingPage.value;
};

onMounted(() => {
    window.ipcRenderer.on("new.dumps", (event) => {
        router.push({ name: "home" }, { xdebug: xDebugStore.current !== "" });
    });
});
</script>

<template>
    <div class="-mr-2">
        <div class="px-1 border-l border-base-content/20 flex items-center justify-center">
            <RouterLink
                :to="inSettingPage ? '/' : '/settings'"
                @click="togglePage"
                class="p-2 hover:bg-base-200 text-base-content cursor-pointer rounded-md"
            >
                <component
                    :is="inSettingPage ? HomeIcon : CogIcon"
                    class="w-5"
                />
            </RouterLink>
        </div>
    </div>
</template>
