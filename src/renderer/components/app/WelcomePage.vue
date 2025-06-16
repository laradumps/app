<script setup>
import AppGuide from "@/components/app/AppGuide.vue";
</script>
<template>
    <div>
        <div class="h-full right-0 flex justify-center items-center">
            <div id="output"></div>
            <!-- welcome page -->
            <div class="w-full px-4 text-sm space-y-5 -top-[80px] relative">
                <!-- app guide -->
                <AppGuide />
            </div>
        </div>
    </div>
</template>
