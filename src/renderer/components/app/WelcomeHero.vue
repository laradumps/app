<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { ClipboardDocumentIcon } from '@heroicons/vue/24/outline';
import { useToastStore } from '@/store/toast';
import logo from '../../../img/icon.png';

/**
 * Top of the empty Home: the brand, and the one instruction that gets the first dump in.
 */
const toast = useToastStore();
const { t } = useI18n();

const SNIPPET = "ds('hello');";

async function copySnippet() {
    await navigator.clipboard.writeText(SNIPPET);
    toast.show(t('toast_copied_to_clipboard'), 'success');
}
</script>

<template>
    <div class="px-4 pt-8 text-center">
        <div class="relative mx-auto size-16">
            <!-- Brand yellow glow; the logo itself is never recolored. -->
            <div
                aria-hidden="true"
                class="absolute -inset-8 rounded-full bg-[#fdbe16]/20 blur-2xl"
            ></div>
            <img
                :src="logo"
                alt=""
                class="relative size-16 drop-shadow-lg"
            />
        </div>
        <div class="mt-3 text-[11px] font-semibold uppercase tracking-[0.25em] text-base-content/45">LaraDumps</div>

        <h1 class="mt-8 flex items-center justify-center gap-2.5 text-lg font-semibold text-base-content">
            <span
                aria-hidden="true"
                class="relative flex size-2"
            >
                <span
                    class="absolute inline-flex size-full rounded-full bg-success opacity-60 motion-safe:animate-ping"
                ></span>
                <span class="relative inline-flex size-2 rounded-full bg-success"></span>
            </span>
            {{ t('welcome.title') }}
        </h1>
        <p class="mt-1 text-sm text-base-content/60">{{ t('welcome.subtitle') }}</p>

        <div
            class="mx-auto mt-5 flex w-fit items-center gap-3 rounded-lg border border-base-content/10 bg-base-100 py-1.5 pl-4 pr-1.5 font-mono text-sm shadow-sm"
        >
            <!-- Not a <code>: a global `code *` rule forces one color on everything inside it. -->
            <span
                ><span class="text-base-content">ds</span><span class="text-base-content/50">(</span
                ><span class="text-[color-mix(in_oklab,var(--color-success)_60%,var(--color-base-content))]"
                    >'hello'</span
                ><span class="text-base-content/50">);</span></span
            >
            <button
                type="button"
                class="grid place-items-center size-7 rounded-md text-base-content/50 hover:bg-base-content/10 hover:text-base-content cursor-pointer"
                :aria-label="t('welcome.copy')"
                :title="t('welcome.copy')"
                @click="copySnippet"
            >
                <ClipboardDocumentIcon class="size-4" />
            </button>
        </div>

        <a
            href="https://laradumps.dev"
            class="mt-3 inline-block text-xs text-base-content/55 underline underline-offset-2 hover:text-base-content"
            >{{ t('welcome.install_guide') }}</a
        >
    </div>
</template>
