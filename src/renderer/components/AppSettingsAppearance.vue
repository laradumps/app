<template>
    <div>
        <label class="text-sm font-normal text-base-700 dark:text-base-400"> {{ $t("settings.appearance") }} </label>

        <div class="mt-0">
            <SelectMenu
                @selected="changeTheme($event.value)"
                :default-value="selectedTheme"
                class="w-full !text-xs"
                v-model:data="themes"
            />
        </div>
    </div>
</template>

<script setup>
import SelectMenu from "@/components/SelectMenu.vue";
import { computed, ref } from "vue";
import { useAppearanceStore } from "@/store/appearance";

const selected = ref("");
const appearanceStore = useAppearanceStore();

const themes = ref([
    {
        value: "dark",
        label: "Dark"
    },
    {
        value: "light",
        label: "Light"
    },
    {
        value: "auto",
        label: "Follow OS Preference"
    }
]);

const changeTheme = (value) => {
    if (value !== undefined) {
        if (value === "dark") {
            appearanceStore.setDark(true);
        }

        if (value === "light") {
            appearanceStore.setLight(true);
        }

        if (value === "auto") {
            appearanceStore.setAuto();
            window.ipcRenderer.send("native-theme");
        }
    }
};

const selectedTheme = computed(() => {
    return themes.value.findIndex((theme) => {
        return theme.value === appearanceStore.theme;
    });
});
</script>
