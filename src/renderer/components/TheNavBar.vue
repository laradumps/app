<template>
    <div class="flex justify-between items-center px-3 py-1.5 bg-neutral-100 shadow text-center z-100 dark:bg-neutral-900 dark:border dark:border-neutral-950">
        <nav class="flex">
            <!-- clear -->
            <a
                v-show="!inSavedDumpsWindow && !settingStore.setting"
                :title="$t('menu.clear')"
                class="justify-center cursor-pointer text-primary-500 group flex items-center p-2"
                @click="clear()"
            >
                <TrashIcon class="w-4 text-neutral-600 hover:text-neutral-900 dark:text-neutral-500 dark:hover:text-neutral-300" />
            </a>

            <!-- saved dumps -->
            <NavBarSavedDumps v-if="!inSavedDumpsWindow" />

<!--            &lt;!&ndash; toggleCollapseAll &ndash;&gt;-->
<!--            <NavBarCollapseAll v-if="payloadCount > 0 && !settingStore.setting" />-->

<!--            &lt;!&ndash; togglePrivacyMode &ndash;&gt;-->
<!--            <NavBarPrivacy v-if="payloadCount > 0 && !settingStore.setting" />-->

<!--            <NavBarReorder v-if="payloadCount > 0 && !settingStore.setting" />-->

            <!--                        <div class="absolute bottom-4 w-full text-center left-0 space-y-3">-->
            <!--                            &lt;!&ndash; toggleAlwaysOnTop &ndash;&gt;-->
            <!--                            <NavBarAlwaysOnTop />-->

            <!--                            &lt;!&ndash; darkMode &ndash;&gt;-->
            <!--                            <NavBarDarkButton />-->

            <!--                            &lt;!&ndash; setting &ndash;&gt;-->
            <!--                            <NavBarSetting v-if="!inSavedDumpsWindow" />-->
            <!--                        </div>-->
        </nav>
        <div>
            <div class="relative rounded-md shadow-sm w-[250px]">
                <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <!-- SearchIcon -->
                    <MagnifyingGlassIcon class="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                </div>
                <input
                    type="text"
                    class="block w-full p-1.5 text-neutral-500 focus:outline-none focus:ring-1 focus:text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:placeholder-neutral-400 rounded-md border-[1px] border-neutral-200 pl-10 dark:!border-neutral-600 focus:border-neutral-400 focus:ring-neutral-500 text-xs"
                    placeholder="Search"
                />
            </div>
        </div>
    </div>
</template>

<script setup>
import { defineProps, defineEmits } from "vue";
import { MagnifyingGlassIcon, TrashIcon } from "@heroicons/vue/24/outline";
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
