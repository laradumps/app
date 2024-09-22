<script setup>
import AppGuide from "@/components/AppGuide.vue";

const props = defineProps({
    localShortcutList: {
        required: true,
        type: Array
    }
});
</script>
<template>
    <div>
        <div class="right-0 flex justify-center items-center">
            <div id="output"></div>

            <!-- welcome page -->
            <div class="w-full px-4 text-sm leading-6">
                <!-- app guide -->
                <AppGuide />
            </div>
        </div>
        <div class="fixed left-[40px] bottom-10 w-auto">
            <div class="flex gap-2 justify-end text-right">
                <div v-for="shortcut in localShortcutList">
                    <span
                        v-if="shortcut.hasOwnProperty('shortcut')"
                        :key="shortcut.alias"
                        class="font-light rounded-md p-1 px-2 text-xs"
                        ><span class="font-normal">{{ $t(shortcut.label) }}</span>: <span class="badge-accent badge">{{ shortcut.originalValue }}</span></span>
                </div>
            </div>
        </div>
    </div>
</template>
