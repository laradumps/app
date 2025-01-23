<script setup lang="ts">
import Divider from '../components/Divider.vue'
import { ref } from 'vue'
import { useSettingsStore } from "@/store/settings";

const saved = ref(false)
const settingsStore = useSettingsStore()

const saveSettings = () => {
    saved.value = true
    settingsStore.update()
    setTimeout(() => {
        saved.value = false
    }, 2000)
}
</script>

<template>
    <div class="pt-[38px] text-base-content">
        <div class="max-w-2xl mx-auto p-10">
            <div class="flex items-center justify-between">
                <h1 class="text-lg">Settings</h1>
                <span :class="{ 'opacity-0': !saved, 'opacity-65': saved }" class="transition-all duration-300"
                >Changes Saved</span
                >
            </div>
            <Divider class="mt-3" />
            <div class="mt-3 grid grid-cols-2 items-center">
                <div>App version</div>
                <div class="flex items-center justify-between">
                    {{ settingsStore.settings.version }}
                </div>
            </div>
            <Divider class="mt-3" />
            <div class="mt-3 grid grid-cols-2 items-center">
                <div>PHP path</div>
                <input class="input input-bordered input-sm w-full" v-model="settingsStore.settings.php" @change="saveSettings()" />
            </div>
            <Divider class="mt-3" />
            <div class="mt-3 grid grid-cols-2 items-center">
                <div>Theme</div>

            </div>
            <Divider class="mt-3" />
            <div class="mt-3 grid grid-cols-2 items-center">
                <div>Editor font size</div>
                <input class="input input-bordered input-sm w-full" v-model="settingsStore.settings.editorFontSize" @change="saveSettings()" />
            </div>
            <Divider class="mt-3" />
            <div class="mt-3 grid grid-cols-2 items-center">
                <div>Editor word wrap</div>
            </div>
        </div>
    </div>
</template>
