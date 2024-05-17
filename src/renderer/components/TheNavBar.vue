<script setup>
import { defineProps, defineEmits } from "vue";
import { TrashIcon, SignalIcon } from "@heroicons/vue/24/outline";
import NavBarAlwaysOnTop from "@/components/NavBarAlwaysOnTop.vue";
import { useSettingStore } from "@/store/setting";
import GlobalSearch from "@/components/GlobalSearch.vue";
import TheNavBarListening from "@/components/TheNavBarListening.vue";
import HeaderGlobalFilter from "@/components/HeaderColorsFilter.vue";

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
    <div class="flex justify-between items-center px-3 py-1 bg-base text-center z-100">
        <nav class="flex">
            <!-- clear -->
            <a
                v-show="payloadCount > 0 && !inSavedDumpsWindow && !settingStore.setting"
                :title="$t('menu.clear')"
                class="justify-center cursor-pointer text-base-500 group flex items-center p-2"
                @click="clear()"
            >
                <TrashIcon class="w-4 text-base hover:opacity-75" />
            </a>
        </nav>

        <div class="flex gap-1 items-center">
            <HeaderGlobalFilter v-bind:has-color="hasColor" />

            <!-- global search -->
            <GlobalSearch v-if="payloadCount > 0" />

            <!-- always on top -->
            <NavBarAlwaysOnTop />

            <!-- listening -->
            <TheNavBarListening />
        </div>
    </div>
</template>
