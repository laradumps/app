<script setup>
import { defineProps, defineEmits } from "vue";
import { TrashIcon } from "@heroicons/vue/24/outline";
import NavBarAlwaysOnTop from "@/components/NavBarAlwaysOnTop.vue";
import { useSettingStore } from "@/store/setting";
import NavBarGlobalSearch from "@/components/NavBarGlobalSearch.vue";
import NavBarListening from "@/components/NavBarListening.vue";
import HeaderGlobalFilter from "@/components/HeaderColorsFilter.vue";
import NavBarPause from "@/components/NavBarPause.vue";
import NavBarCollapse from "@/components/NavBarCollapse.vue";
import NavBarSSH from "@/components/NavBarSSH.vue";
import NavBarSettings from "@/components/NavBarSettings.vue";
import { usePayloadStore } from "@/store/payload";

defineProps({
    hasColor: {
        type: Boolean,
        required: true
    },
    inSavedDumpsWindow: {
        type: Boolean,
        default: false
    }
});

const settingStore = useSettingStore();
const payloadStore = usePayloadStore();

const emit = defineEmits(["clearAll"]);

const clear = () => {
    emit("clearAll");
};
</script>

<template>
    <div class="flex justify-between items-center px-2 text-center z-100 border-b border-base-content/10">
        <div class="ml-8 w-full select-none flex justify-between">
            <div class="ml-10 w-auto h-full">
                <div class="flex gap-1 items-center">

                    <!-- clear -->
                    <a
                        v-show="payloadStore.payload.length > 0 && !inSavedDumpsWindow && !settingStore.setting"
                        :title="$t('menu.clear')"
                        class="w-[32px] tab px-1.5 py-2 hover:bg-base-200 text-base-content cursor-pointer transition-all duration-100 ease-in rounded-md"
                        @click="clear()"
                    >
                        <TrashIcon class="size-4" />
                    </a>

                    <!-- pause -->
                    <NavBarPause v-if="payloadStore.payload.length > 0" v-bind:is-saved-dumps-window="inSavedDumpsWindow" />
                </div>
            </div>
            <div class="w-full nav-bar">&nbsp;</div>
        </div>

        <div class="flex gap-1 items-center m-0.5">
<!--            <HeaderGlobalFilter v-bind:has-color="hasColor" />-->

            <!-- global search -->
            <NavBarGlobalSearch v-if="payloadStore.payload.length > 0" />

            <!-- collapse -->
            <NavBarCollapse v-if="payloadStore.payload.length > 0" />

            <!-- always on top -->
            <NavBarAlwaysOnTop />

            <!-- ssh -->
            <NavBarSSH />

            <!-- listening -->
            <NavBarListening v-if="!inSavedDumpsWindow" />

            <!-- always on top -->
            <NavBarSettings />
        </div>
    </div>
</template>
