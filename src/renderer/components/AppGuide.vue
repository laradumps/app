<script setup>
import { onMounted, onUnmounted, ref, computed } from "vue";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/vue/24/outline";
import { useI18n } from "vue-i18n";

const i18n = useI18n();

const currentIndex = ref(0);
const currentTipKey = ref(0);

const tips = ref([
    `<div class="space-y-3 text-base-content">
        <div class="font-semibold text-base">${i18n.t("doc.guide")}</div>
        <li>${i18n.t(
            "doc.install_laradumps"
        )}: <span onclick="window.ipcRenderer.send('main:openLink', 'https://laradumps.dev')" class="text-blue-500 underline cursor-pointer ml-1">https://laradumps.dev</span></li>
        <li>${i18n.t("doc.add")}
            <code class="bg-base-300 p-1 rounded">ds('Hello world!')</code>
             ${i18n.t("doc.somewhere_in_your_code")}</li>
        <li>${i18n.t("doc.run_your_application_and_see_what_happens_here")}</li>
    </div>`,
    `<div>
        <div class="space-y-3 text-base-content">
            <div class="font-semibold text-base">${i18n.t("doc.global_shortcuts")}</div>
            <li>${i18n.t("doc.customize_shortcuts")}</li>
            <li>${i18n.t("doc.available")}: <span class="italic font-light>${i18n.t("doc.shortcuts_list")}</span></li>
        </div>
    </div>`,
    `<div>
        <div class="space-y-3 text-base-content">
            <div class="font-semibold text-base">${i18n.t("doc.install_laradumps_globally")}</div>
            <li>
                <code class="bg-base-300 p-1 rounded">composer global require laradumps/global-laradumps</code>
            </li>
            <li>${i18n.t("doc.run")} <code class="bg-base-300 p-1 rounded">global-laradumps install</code></li>
        </div>
    </div>`,
    `<div>
        <div class="space-y-3 text-base-content">
            <div class="font-semibold text-base">${i18n.t("doc.select_your_preferred_theme")}</div>
            <li>
                <code class="bg-base-300 p-1 rounded">Menu -> Theme</code>
            </li>
            <li><code class="bg-base-300 p-1 rounded">light, dark, dracula, dim, laravel ...</code></li>
        </div>
    </div>`,
    `<div>
        <div class="space-y-3 text-base-content">
            <div class="font-semibold text-base">${i18n.t("doc.change_your_ide_at_runtime")}</div>
            <li>
                <code class="bg-base-300 p-1 rounded">Menu -> IDE</code>
            </li>
            <li><code class="bg-base-300 p-1 rounded">PHPStorm, vs code, vs code remote ...</code></li>
        </div>
    </div>`,
    `<div>
        <div class="space-y-3 text-base-content">
            <div class="font-semibold text-base">${i18n.t("doc.install_laravel")}</div>
            <li>
                <code class="bg-base-300 p-1 rounded">composer require laradumps/laradumps ^3.0 --dev</code>
            </li>
            <li>${i18n.t("doc.run")} <code class="bg-base-300 p-1 rounded">php artisan ds:init $(pwd)</code></li>
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

<template>
    <div>
        <div class="carousel1 mt-6">
            <button
                v-if="currentIndex > 0"
                class="arrow left hidden group-hover:block"
                @click="previous"
            >
                <ChevronLeftIcon class="w-5" />
            </button>
            <div class="content">
                <div
                    :key="currentTipKey"
                    class="mt-3 text-xs font-normal"
                >
                    <div
                        v-html="currentTip"
                        class="!text-neutral"
                    ></div>
                </div>
            </div>
            <button
                class="arrow right hidden group-hover:block"
                @click="next"
            >
                <ChevronRightIcon class="w-5 dark:text-base-500 dark:hover:text-base-300" />
            </button>
        </div>
    </div>
</template>

<style>
.carousel1 {
    @apply h-[200px] flex items-center justify-center relative;
}

.carousel1 .content {
    @apply left-[15px] absolute w-full top-0;
}

.carousel1 > div.active {
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
