import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { Settings } from "@/types/settings.type";

export const useSettingsStore = defineStore('settings', () => {
  let defaultSettings: Settings = {
    version: '',
    laravelPath: '',
    php: '',
    theme: 'dracula',
    editorFontSize: 15,
    editorWordWrap: 'on',
    layout: 'vertical',
  }

  const settings = ref<Settings>(defaultSettings)

  const update = () => {
    // clone settings json
    window.ipcRenderer.send('settings.store', {
      ...settings.value,
    })
  }

  return { settings, update }
})
