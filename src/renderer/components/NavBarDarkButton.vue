<template>
    <div>
        <button
            title="Dark Mode"
            :class="{
                'bg-slate-200 shadow border border-slate-300 dark:border-slate-500 dark:bg-slate-800 dark:hover:border-slate-400': dark
            }"
            class="rounded-full p-1.5"
            @click="toggleDarkMode"
        >
            <div>
                <IconLightOn
                    :class="{ hidden: !dark }"
                    :stroke="dark ? '#94A3B8' : '#334155'"
                />

                <IconLightOff
                    :class="{ hidden: dark }"
                    :stroke="dark ? '#94A3B8' : '#334155'"
                />
            </div>
        </button>
    </div>
</template>

<script setup>
import { computed, defineEmits } from "vue";
import { useAppearanceStore } from "@/store/appearance";
import IconLightOn from "@/components/Icons/IconLightOn.vue";
import IconLightOff from "@/components/Icons/IconLightOff.vue";

const appearanceStore = useAppearanceStore();

defineEmits(["dark-switch"]);

const dark = computed(() => appearanceStore.dark);

const toggleDarkMode = () => {
    appearanceStore.toggle();
};
</script>
