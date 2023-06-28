<template>
    <div>
        <div class="space-y-6 sm:space-y-5">
            <div class="sm:grid sm:grid-cols-3 sm:items-start sm:gap-4 sm:border-t sm:border-gray-200 sm:pt-5">
                <label class="block text-sm font-normal text-gray-700 dark:text-slate-400 sm:mt-px sm:pt-2"> {{ $t("settings.language") }} </label>

                <div class="mt-1 sm:col-span-2 sm:mt-0">
                    <SelectMenu
                        @selected="changeLocale($event.value)"
                        :default-value="selectedLanguage"
                        class="w-[190px] !text-xs"
                        v-model:data="languages"
                    />
                </div>
            </div>
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
