<template>
    <div>
        <button
            :class="{
                'bg-slate-200 shadow border border-slate-300 dark:border-slate-500 dark:bg-slate-800 dark:hover:border-slate-400': settingStore.setting
            }"
            class="rounded-full p-1.5 text-slate-600 dark:text-slate-400 dark:hover:text-slate-200"
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
