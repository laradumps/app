<script setup lang="ts">
import { useSettingStore } from "@/store/setting";

const settingStore = useSettingStore();
const payloadStore = usePayloadStore();

import TheNavBar from "@/components/TheNavBar.vue";
import { usePayloadStore } from "@/store/payload";

//* * Convert shortcuts to Electron format **/
Object.defineProperty(String.prototype, "beautifyShortcut", {
    value() {
        if (process.platform === "darwin") {
            return this.replace("CommandOrControl", "⌘").replace("Shift", "⇧").replace("Option", "⌥");
        }
        return this.replace("CommandOrControl", "⊞").replace("Shift", "⇧").replace("Option", "⌥");
    }
});

Object.defineProperty(String.prototype, "toElectronFormat", {
    value() {
        return this.replace("", "CommandOrControl").replace("⌃", "CommandOrControl").replace("⌘", "CommandOrControl").replace("⇧", "Shift").replace("⌥", "Option");
    }
});
</script>

<template>
    <div>
        <div class="flex overflow-hidden flex-col flex-1 right-0 left-0 h-fill-available">
            <div
                :class="{
                    '!space-y-0': payloadStore.payload.length > 0
                }"
                class="absolute w-full h-full min-h-full space-y-3"
            >
                <TheNavBar
                    v-if="!settingStore.setting"
                    has-color
                />

                <main class="w-full h-full">
                    <RouterView :key="$route.fullPath" />
                </main>
            </div>
        </div>
    </div>
</template>
