<script setup lang="ts">
import { computed } from 'vue';
import { InboxIcon } from '@heroicons/vue/24/outline';
import { isKnownScreen } from '@/constants';

const props = withDefaults(
    defineProps<{
        title?: string;
        message?: string;
        screen?: string;
    }>(),
    {
        title: '',
        message: '',
        screen: ''
    }
);

const EXAMPLES: Record<string, string> = {
    home: 'ds($value)',
    queries: 'User::first()',
    logs: "Log::info('Order shipped')",
    tail_logs: "Log::info('Order shipped')",
    jobs: 'dispatch(new SendInvoice($order))',
    mail: 'Mail::to($user)->send(new Welcome)',
    http: "Http::get('https://laravel.com')",
    cache: "Cache::remember('key', 60, fn () => 'value')",
    gate: "Gate::allows('update', $post)",
    commands: 'php artisan inspire',
    scheduled_commands: 'php artisan schedule:run',
    profiler: 'ds()->profile(fn () => $report->build())'
};

const example = computed(
    () =>
        EXAMPLES[props.screen] ??
        (props.screen && !isKnownScreen(props.screen) ? `ds($value)->toScreen('${props.screen}')` : '')
);
</script>

<template>
    <div class="flex flex-col items-center justify-center gap-3 text-center select-none">
        <div class="grid size-11 place-items-center rounded-xl bg-base-content/5 ring-1 ring-base-content/10">
            <InboxIcon class="size-5 text-base-content/40" />
        </div>
        <div class="space-y-1">
            <slot name="title">
                <h1 class="text-sm font-medium text-base-content/80">
                    {{ title || $t('empty') }}
                </h1>
            </slot>
            <slot name="message">
                <p class="max-w-xs text-xs text-base-content/50">
                    {{ message || $t('empty_message') }}
                </p>
            </slot>
        </div>
        <slot>
            <code
                v-if="example"
                class="rounded-md bg-base-content/5 px-2 py-1 font-mono text-[11px] text-base-content/60 ring-1 ring-base-content/10 select-text"
                >{{ example }}</code
            >
        </slot>
    </div>
</template>
