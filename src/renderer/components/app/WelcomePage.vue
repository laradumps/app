<script setup>
import WelcomeHero from '@/components/app/WelcomeHero.vue';
</script>

<template>
    <div class="relative isolate flex h-full w-full flex-col items-center justify-center overflow-hidden">
        <div id="output"></div>
        <div
            aria-hidden="true"
            class="welcome-grid pointer-events-none absolute inset-0 -z-10 text-base-content"
        ></div>
        <WelcomeHero />
    </div>
</template>

<style scoped>
/* Faint dot grid that fades out from the center; currentColor keeps it right in every theme. */
.welcome-grid {
    background-image: radial-gradient(currentColor 1px, transparent 1px);
    background-size: 22px 22px;
    opacity: 0.08;
    mask-image: radial-gradient(ellipse 55% 50% at 50% 45%, black, transparent);
}
</style>
