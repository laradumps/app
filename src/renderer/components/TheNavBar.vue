<template>
    <div class="flex justify-between items-center px-3 py-1 bg-base-100 shadow text-center z-100">
        <nav class="flex">
            <!-- clear -->
            <a
                v-show="!inSavedDumpsWindow && !settingStore.setting"
                :title="$t('menu.clear')"
                class="justify-center cursor-pointer text-base-500 group flex items-center p-2"
                @click="clear()"
            >
                <TrashIcon class="w-4 text-base hover:text-neutral" />
            </a>

            <!-- saved dumps -->
            <!--  <NavBarSavedDumps v-if="!inSavedDumpsWindow" />-->

            <NavBarPrivacy v-if="payloadCount > 0 && !settingStore.setting" />

            <!--  <NavBarReorder v-if="payloadCount > 0 && !settingStore.setting" />-->

            <!--                        <div class="absolute bottom-4 w-full text-center left-0 space-y-3">-->
            <!--                            &lt;!&ndash; toggleAlwaysOnTop &ndash;&gt;-->
            <!--                            <NavBarAlwaysOnTop />-->

            <!--                            &lt;!&ndash; setting &ndash;&gt;-->
            <!--                            <NavBarSetting v-if="!inSavedDumpsWindow" />-->
            <!--                        </div>-->
        </nav>


        <div class="flex gap-3 items-center">
            <GlobalSearch />
            <NavBarAlwaysOnTop />
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
import IconPin from "@/components/Icons/IconPin.vue";
import GlobalSearch from "@/components/GlobalSearch.vue";

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
