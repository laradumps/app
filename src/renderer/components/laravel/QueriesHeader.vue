<script setup lang="ts">
import { useTimeStore } from "@/store/time";
import { useFormattedQueriesStore } from "@/store/formatted-queries";
import { SparklesIcon, AdjustmentsHorizontalIcon } from "@heroicons/vue/24/outline";

const timeStore = useTimeStore();
const formattedQueriesStore = useFormattedQueriesStore();
</script>

<template>
    <div class="flex flex-col z-100 h-auto w-full">
        <div
            v-if="timeStore.groups.length > 0"
            class="justify-between items-center gap-4 text-base-content"
        >
            <div class="flex justify-between uppercase py-1">
                <!-- Actions -->
                <div class="flex items-center">
                    <div class="dropdown dropdown-end">
                        <div
                            tabindex="0"
                            role="button"
                            class="btn btn-sm px-2 bg-transparent border-0"
                            data-tippy-content="Order by and Filter Origin"
                        >
                            <AdjustmentsHorizontalIcon class="w-4.5" />
                        </div>
                    </div>

                    <button
                        data-tippy-content="Prettify"
                        class="btn btn-sm px-2 bg-transparent border-0"
                        @click="formattedQueriesStore.toggle()"
                    >
                        <SparklesIcon
                            :class="{
                                'w-4': true,
                                'w-4 text-secondary': formattedQueriesStore.formatted
                            }"
                        />
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>
