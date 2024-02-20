<template>
    <div>
        <button
            :class="{
                'bg-primary-200 shadow border border-primary-300 dark:border-primary-500 dark:bg-primary-800 dark:hover:border-primary-400': settingStore.setting
            }"
            class="rounded-full p-1.5 text-primary-600 dark:text-primary-400 dark:hover:text-primary-200"
            :title="$t('menu.settings')"
            @click="settingStore.toggle()"
        >
            <AdjustmentsHorizontalIcon class="h-5 w-5" />
        </button>
    </div>
</template>

<script setup>
import { AdjustmentsHorizontalIcon } from "@heroicons/vue/24/outline";
import { useSettingStore } from "@/store/setting";

const settingStore = useSettingStore();
</script>
