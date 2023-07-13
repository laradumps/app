<template>
    <div>
        <label class="text-sm font-normal text-slate-700 dark:text-slate-400"> {{ $t("settings.language") }} </label>

        <div class="mt-0">
            <SelectMenu
                @selected="changeLocale($event.value)"
                :default-value="selectedLanguage"
                class="w-full !text-xs"
                v-model:data="languages"
            />
        </div>
    </div>
</template>

<script setup>
import SelectMenu from "@/components/SelectMenu.vue";
import { computed, ref } from "vue";
import { useI18nStore } from "@/store/i18n";
import { useI18n } from "vue-i18n";

const localeStore = useI18nStore();
const { locale } = useI18n({ useScope: "global" });

const languages = ref([
    {
        value: "en",
        label: "English"
    },
    {
        value: "pt_BR",
        label: "Português (BR)"
    },
    {
        value: "es_ES",
        label: "Español (ES)"
    },
    {
        value: "fa_IR",
        label: "فارسی (IR)"
    },
    {
        value: "it_IT",
        label: "Italiano (IT)"
    },
    {
        value: "zh_CN",
        label: "Chinese (CN)"
    },
    {
        value: "id_ID",
        label: "Indonesian (ID)"
    }
]);

const changeLocale = (value) => {
    if (value !== undefined) {
        localeStore.set(value);
        locale.value = value;
    }
};

const selectedLanguage = computed(() => {
    return languages.value.findIndex((lang) => {
        return lang.value === localStorage.locale;
    });
});
</script>
