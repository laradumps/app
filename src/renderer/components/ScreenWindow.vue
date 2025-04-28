<script setup lang="ts">
import { defineProps, onUpdated, nextTick } from "vue";
import DumpItem from "@/components/DumpItem.vue";
import { useSettingsStore } from "@/store/settings";

const settingsStore = useSettingsStore();

defineProps<{
    dumps: Object;
    screen: String;
}>();

onUpdated(async () => {
    await nextTick();

    document.getElementById("top").scrollIntoView({
        behavior: "smooth"
    });
});
</script>

<template>
    <div class="flex flex-col">
        <div id="top"></div>

        <div class="flex mt-2 flex-col overflow-auto h-[calc(100vh-1rem)]">
            <div id="top"></div>

            <div
                class="w-full"
                :class="{
                    'flex flex-col-reverse': settingsStore.settings.dump_order === 'reversed'
                }"
            >
                <div
                    class="w-full"
                    :id="payload.id"
                    v-for="(payload, index) in dumps"
                    :key="payload.sf_dump_id"
                >
                    <DumpItem
                        class="w-full px-2 group text-sm mb-2"
                        :index="index"
                        :payload="payload"
                        v-show="screen !== 'livewire'"
                    />
                </div>
            </div>
        </div>
    </div>
</template>
