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

        <div class="flex gap-4 items-center">
            <!-- global search -->
            <GlobalSearch />
            <!-- always on top -->
            <NavBarAlwaysOnTop />
        </div>
    </div>
</template>

<script setup>
import { defineProps, defineEmits } from "vue";
import { TrashIcon } from "@heroicons/vue/24/outline";
import NavBarAlwaysOnTop from "@/components/NavBarAlwaysOnTop.vue";
import { useSettingStore } from "@/store/setting";
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
