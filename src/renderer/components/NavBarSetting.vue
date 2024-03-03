<script setup>
import { AdjustmentsHorizontalIcon } from "@heroicons/vue/24/outline";
import { useSettingStore } from "@/store/setting";

const settingStore = useSettingStore();
</script>

<template>
    <div>
        <button
            :class="{
                'bg-base-200 shadow border border-base-300 dark:border-base-500 dark:bg-base-800 dark:hover:border-base-400': settingStore.setting
            }"
            class="rounded-full p-1.5 text-base-600 dark:text-base-400 dark:hover:text-base-200"
            :title="$t('menu.settings')"
            @click="settingStore.toggle()"
        >
            <AdjustmentsHorizontalIcon class="h-5 w-5" />
        </button>
    </div>
</template>
