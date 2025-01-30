<script setup lang="ts">
import TheNavBar from "@/components/TheNavBar.vue";
import { usePayloadStore } from "@/store/payload";
import { onMounted, ref } from "vue";
import { useSettingsStore } from "@/store/settings";

const payloadStore = usePayloadStore();
const settingsStore = useSettingsStore();

const readyToLoad = ref(false);

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

const getZoomLevel = (value: number): void => {
    let zoomFactor = value;

    window.webFrame.setZoomFactor(zoomFactor);

    document.querySelector("body").addEventListener(
        "mousewheel",
        (e) => {
            if (e.ctrlKey) {
                let value;
                e.preventDefault();

                value = e.deltaY > 0 ? (zoomFactor -= 0.1) : (zoomFactor += 0.1);

                window.ipcRenderer.send("main:update-zoom-level", value);

                window.webFrame.setZoomFactor(value);
            }
        },
        {
            passive: false
        }
    );
};

onMounted(() => {
    window.ipcRenderer.on("init.reply", async (e: any, args) => {
        settingsStore.setSettings(args.settings);
        readyToLoad.value = true;
        window.ipcRenderer.send("settings.init-shortcuts");
    });

    window.ipcRenderer.send("zoom-level");
    window.ipcRenderer.on("zoom-level.reply", (event, value) => getZoomLevel(value));
});
</script>

<template>
    <div class="flex overflow-hidden flex-col flex-1 right-0 left-0 h-fill-available">
        <div
            :data-theme="settingsStore.settings.theme"
            :class="{
                '!space-y-0': payloadStore.payload.length > 0
            }"
            class="absolute w-full h-full min-h-full"
        >
            <TheNavBar has-color />

            <main class="w-full overflow-auto h-[calc(100vh-50px)]">
                <RouterView :key="$route.fullPath" />
            </main>
        </div>
    </div>
</template>
