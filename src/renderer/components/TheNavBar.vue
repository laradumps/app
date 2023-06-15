<template>
    <div class="flex w-16 text-center items-center flex-col fixed inset-y-0 z-100">
        <div class="flex flex-col w-full flex-grow shadow-md dark:shadow-slate-900 bg-white dark:bg-slate-800 overflow-y-auto">
            <div class="flex-grow flex flex-col">
                <div>
                    <nav class="flex-1 justify-center items-center p-2 space-y-2">
                        <!-- clear -->
                        <a
                            v-show="payloadCount > 0 && !inSavedDumpsWindow && !settingStore.setting"
                            :title="$t('menu.clear')"
                            class="justify-center cursor-pointer text-slate-500 group flex items-center p-2"
                            @click="clear()"
                        >
                            <TrashIcon class="h-5 w-5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-300" />
                        </a>

                        <!-- saved dumps -->
                        <NavBarSavedDumps v-if="!inSavedDumpsWindow" />

                        <!-- toggleCollapseAll -->
                        <NavBarCollapseAll v-if="payloadCount > 0 && !settingStore.setting" />

                        <!-- togglePrivacyMode -->
                        <NavBarPrivacy v-if="payloadCount > 0 && !settingStore.setting" />

                        <NavBarReorder v-if="payloadCount > 0 && !settingStore.setting" />

                        <div class="absolute bottom-4 w-full text-center left-0 space-y-3">
                            <!-- toggleAlwaysOnTop -->
                            <NavBarAlwaysOnTop />

                            <!-- darkMode -->
                            <NavBarDarkButton />

                            <!-- setting -->
                            <NavBarSetting />
                        </div>
                    </nav>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { defineProps, defineEmits } from "vue";
import { TrashIcon } from "@heroicons/vue/24/outline";
import NavBarDarkButton from "@/components/NavBarDarkButton.vue";
import NavBarCollapseAll from "@/components/NavBarCollapseAll.vue";
import NavBarPrivacy from "@/components/NavBarPrivacy.vue";
import NavBarSetting from "@/components/NavBarSetting.vue";
import NavBarReorder from "@/components/NavBarReorder.vue";
import NavBarSavedDumps from "@/components/NavBarSavedDumps.vue";
import NavBarAlwaysOnTop from "@/components/NavBarAlwaysOnTop.vue";
import { useSettingStore } from "@/store/setting";

defineProps({
    payloadCount: {
        type: Number,
        default: 0
    },
    inSavedDumpsWindow: {
        type: Boolean,
        default: false
    }
});

const settingStore = useSettingStore();

const emit = defineEmits(["clearAll"]);

const clear = () => {
    emit("clearAll");
};
</script>
