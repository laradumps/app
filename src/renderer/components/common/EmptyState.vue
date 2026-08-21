<script setup lang="ts">
import SvgEmpty from '@/components/svg/SvgEmpty.vue';

withDefaults(
    defineProps<{
        title?: string;
        message?: string;
    }>(),
    {
        title: '',
        message: ''
    }
);
</script>

<template>
    <div class="flex flex-col items-center justify-center text-center">
        <SvgEmpty class="w-30 opacity-25 mx-auto" />
        <div class="text-base-content/70">
            <slot name="title">
                <h1 class="text-lg font-semibold mb-2">
                    {{ title || $t('empty') }}
                </h1>
            </slot>
            <slot name="message">
                <p
                    v-if="message"
                    class="text-xs max-w-sm"
                >
                    {{ message }}
                </p>
            </slot>
            <slot />
        </div>
    </div>
</template>
