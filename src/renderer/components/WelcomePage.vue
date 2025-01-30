<script setup>
import AppGuide from "@/components/AppGuide.vue";
import { onMounted, ref } from "vue";

const iconPath = ref();

onMounted(() => {
    window.ipcRenderer.send("get-icon");
    window.ipcRenderer.on("icon", (event, args) => {
        iconPath.value = args;
    });
});
</script>
<template>
    <div>
        <div class="right-0 flex justify-center items-center">
            <div id="output"></div>

            <!-- welcome page -->
            <div class="w-full px-4 text-sm space-y-2">
                <div class="w-full flex justify-center">
                    <img
                        :src="iconPath"
                        alt=""
                        class="size-16 mr-2"
                    />
                </div>

                <!-- app guide -->
                <AppGuide />
            </div>
        </div>
    </div>
</template>
