<template>
    <div class="carousel">
        <button
            v-if="currentIndex > 0"
            class="arrow left hidden group-hover:block"
            @click="previous"
        >
            <ChevronLeftIcon class="w-5 dark:text-slate-500 dark:hover:text-slate-300" />
        </button>
        <div class="content">
            <div
                :key="currentTipKey"
                class="mt-3 text-sm font-normal"
            >
                <div
                    v-html="currentTip"
                    class="tip"
                ></div>
            </div>
        </div>
        <button
            class="arrow right hidden group-hover:block"
            @click="next"
        >
            <ChevronRightIcon class="w-5 dark:text-slate-500 dark:hover:text-slate-300" />
        </button>
    </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, computed } from "vue";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/vue/24/outline";
import { useI18n } from "vue-i18n";

const i18n = useI18n();

const currentIndex = ref(0);
const currentTipKey = ref(0);

const tips = ref([
    `<div class="space-y-3">
        <div class="font-semibold text-base">${i18n.t("doc.guide")}</div>
        <li>${i18n.t(
            "doc.install_laradumps"
        )}: <span onclick="window.ipcRenderer.send('main:openLink', 'https://laradumps.dev')" class="text-blue-500 underline cursor-pointer dark:text-blue-300 ml-1">https://laradumps.dev</span></li>
        <li>${i18n.t("doc.add")}
            <code class="border border-slate-300 bg-white text-slate-600 p-0.5 rounded">ds('Hello world!')</code>
             ${i18n.t("doc.somewhere_in_your_code")}</li>
        <li>${i18n.t("doc.run_your_application_and_see_what_happens_here")}</li>
    </div>`,
    `<div>
        <div class="space-y-3">
            <div class="font-semibold text-base">${i18n.t("doc.global_shortcuts")}</div>
            <li>${i18n.t("doc.customize_shortcuts")}</li>
            <li>${i18n.t("doc.available")}: <span class="italic font-light dark:text-slate-400">${i18n.t("doc.shortcuts_list")}</span></li>
        </div>
    </div>`,
    `<div>
        <div class="space-y-3">
            <div class="font-semibold text-base">${i18n.t("doc.add_project_here")}</div>
            <li>${i18n.t("doc.run_in_php_project")}: <code class="border border-slate-300 bg-white text-slate-600 p-0.5 rounded">vendor/bin/laradumps configure</code></li>
            <li>${i18n.t("doc.finish_setting_env_vars")}</li>
        </div>
    </div>`,
    `<div>
        <div class="space-y-3">
            <div class="font-semibold text-base">${i18n.t("doc.install_laradumps_globally")}</div>
            <li>
                <code class="border border-slate-300 bg-white text-slate-600 p-0.5 rounded">composer global require laradumps/global-laradumps</code>
            </li>
            <li>${i18n.t("doc.run")} <code class="border border-slate-300 bg-white text-slate-600 p-0.5 rounded">global-laradumps install</code></li>
        </div>
    </div>`,
    `<div>
        <div class="space-y-3">
            <div class="font-semibold text-base">${i18n.t("doc.update_laradumps_environments")}</div>
            <li>${i18n.t("doc.choose_project")}</li>
            <li>${i18n.t("doc.update_keys")}: <code class="border border-slate-300 bg-white text-slate-600 p-0.5 rounded">DS_LOGS_APPLICATION, DS_SEND_MAIL</code> ...</li>
        </div>
    </div>`
]);

const currentTip = computed(() => tips.value[currentIndex.value]);

let timer;

function startTimer() {
    timer = setInterval(() => {
        nextRandom();
    }, 20000);
}

function stopTimer() {
    clearInterval(timer);
}

onMounted(() => {
    startTimer();
    document.addEventListener("keydown", handleKeyboardEvents);
});

onUnmounted(() => {
    stopTimer();
    document.removeEventListener("keydown", handleKeyboardEvents);
});

function handleKeyboardEvents(event) {
    const key = event.key;

    if (key === "ArrowRight") {
        next();
    } else if (key === "ArrowLeft") {
        previous();
    }
}

function previous() {
    currentIndex.value = (currentIndex.value - 1 + tips.value.length) % tips.value.length;
}

function next() {
    currentIndex.value = (currentIndex.value + 1) % tips.value.length;
    currentTipKey.value++;
}

function nextRandom() {
    let nextIndex = currentIndex.value;

    while (nextIndex === currentIndex.value) {
        nextIndex = Math.floor(Math.random() * tips.value.length);
    }

    currentIndex.value = nextIndex;
    currentTipKey.value++;
}
</script>

<style>
.carousel {
    @apply h-[200px] flex items-center justify-center relative;
}

.content {
    @apply left-[15px] absolute w-full top-[28px];
}

.carousel > div.active {
    @apply block;
}

.arrow {
    @apply absolute top-[50%] bg-transparent border-0 cursor-pointer;
}

.arrow.left {
    @apply left-[-30px];
}

.arrow.right {
    @apply right-[-30px];
}

.active {
    @apply !block;
}
</style>
