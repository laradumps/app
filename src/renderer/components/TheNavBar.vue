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

defineProps({
    hasColor: {
        type: Boolean,
        required: true
    },
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

<template>
    <div class="flex justify-between items-center pb-0.5 px-2 text-center z-100">
        <div class="ml-8 w-full select-none nav-bar">&nbsp;</div>

        <div class="flex gap-1 items-center mt-0.5">
            <HeaderGlobalFilter v-bind:has-color="hasColor" />

            <!-- clear -->
            <a
                v-show="payloadCount > 0 && !inSavedDumpsWindow && !settingStore.setting"
                :title="$t('menu.clear')"
                class="w-[32px] tab px-1.5 py-2 hover:bg-base-200 text-base-content cursor-pointer transition-all duration-100 ease-in rounded-md"
                @click="clear()"
            >
                <TrashIcon class="size-4" />
            </a>

            <!-- pause -->
            <NavBarPause v-bind:is-saved-dumps-window="inSavedDumpsWindow" />

            <!-- global search -->
            <NavBarGlobalSearch v-if="payloadCount > 0" />

            <!-- collapse -->
            <NavBarCollapse v-if="payloadCount > 0" />

            <!-- always on top -->
            <NavBarAlwaysOnTop />

            <!-- ssh -->
            <NavBarSSH />

            <!-- listening -->
            <NavBarListening v-if="!inSavedDumpsWindow" />
        </div>
    </div>
</template>
