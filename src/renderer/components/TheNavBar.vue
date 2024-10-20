<script setup>
import { defineProps, defineEmits, ref } from "vue";
import { TrashIcon } from "@heroicons/vue/24/outline";
import NavBarAlwaysOnTop from "@/components/NavBarAlwaysOnTop.vue";
import { useSettingStore } from "@/store/setting";
import GlobalSearch from "@/components/GlobalSearch.vue";
import TheNavBarListening from "@/components/TheNavBarListening.vue";
import HeaderGlobalFilter from "@/components/HeaderColorsFilter.vue";
import NavBarPause from "@/components/NavBarPause.vue";

defineProps({
    hasColor: {
        type: Boolean,
        required: true
    },
    xdebugMode: {
        type: Boolean,
        required: true,
        default: false
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

const xdebugConnected = ref(false);
const clear = () => {
    emit("clearAll");
};

window.ipcRenderer.on("xdebug-connection-status", (event, args) => {
    console.log(args);
    xdebugConnected.value = args.connected;
});
</script>

<template>
    <div class="flex justify-between items-center gap-3 px-2 my-1.5 text-center z-100">
        <div class="ml-8 w-full select-none movable-container h-[38px]">&nbsp;</div>

        <div class="flex gap-2 items-center">
            <span
                v-if="xdebugConnected"
                class="badge badge-success text-[10px] tracking-widest font-semibold whitespace-nowrap"
                >xdebug: connected</span
            >

            <HeaderGlobalFilter v-bind:has-color="hasColor && !xdebugMode" />

            <!-- clear -->
            <a
                v-show="payloadCount > 0 && !inSavedDumpsWindow && !settingStore.setting && !xdebugMode"
                :title="$t('menu.clear')"
                class="px-1.5 py-2 hover:bg-base-200 text-base-content cursor-pointer transition-all duration-100 ease-in rounded-md"
                @click="clear()"
            >
                <TrashIcon class="size-4" />
            </a>

            <!-- pause -->
            <NavBarPause
                v-if="!xdebugMode"
                v-bind:is-saved-dumps-window="inSavedDumpsWindow"
            />

            <!-- global search -->
            <GlobalSearch v-if="payloadCount > 0" />

            <!-- always on top -->
            <NavBarAlwaysOnTop />

            <!-- listening -->
            <TheNavBarListening v-if="!inSavedDumpsWindow" />
        </div>
    </div>
</template>
