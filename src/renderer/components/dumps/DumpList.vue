<script lang="ts" setup>
import { usePayloadStore } from '@/store/payload';
import { useScreenStore } from '@/store/screen';
import { useSettingsStore } from '@/store/settings';
import { Payload } from '@/types/Payload';
import DumpItem from '@/components/dumps/DumpItem.vue';
import DumpLivewire from '@/components/laravel/DumpLivewire.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import WelcomePage from '@/components/app/WelcomePage.vue';
import { ClockIcon } from '@heroicons/vue/24/outline';
import { computed } from 'vue';
import dayjs from 'dayjs';

defineOptions({ name: 'DumpList' });

const props = withDefaults(
    defineProps<{
        dumpsBagFiltered: Payload[];
        groupedDumps: Record<string, Payload[]>;
        showWelcome?: boolean;
        emptyScreenExclude?: string[];
        containerClass?: string;
        groupStickyClass?: string;
        groupMarginClass?: string;
        screenName?: string;
    }>(),
    {
        showWelcome: true,
        emptyScreenExclude: () => []
    }
);

const payloadStore = usePayloadStore();
const screenStore = useScreenStore();
const settingsStore = useSettingsStore();
const listScreen = computed(() => props.screenName ?? screenStore.screen);
</script>

<template>
    <div :class="[containerClass ?? 'flex flex-col rounded-sm text-base w-full h-full']">
        <div id="top"></div>

        <div :class="{ 'w-full': dumpsBagFiltered.length === 0 && listScreen !== 'home' }">
            <div
                id="dumps-base"
                class="w-full mb-10"
                v-if="payloadStore.payload.length > 0"
                :class="{
                    'flex flex-col-reverse': settingsStore.settings.dump_order === 'normal'
                }"
            >
                <div
                    v-for="(group, groupKey, index) in groupedDumps"
                    :key="groupKey"
                    class="w-full"
                    :class="groupMarginClass ? { [groupMarginClass]: index === 0 } : {}"
                >
                    <div
                        v-if="!['livewire'].includes(listScreen) && settingsStore.settings.grouped_by_time"
                        class="bg-base-200 flex-1 text-left px-4 py-1.5 z-70 text-xs"
                        :class="groupStickyClass ?? 'sticky top-0'"
                    >
                        <span
                            class="flex items-center gap-1 opacity-70"
                            :title="groupKey"
                        >
                            <ClockIcon class="w-3 h-3" />
                            {{ dayjs(groupKey).format('HH:mm:ss') }}
                        </span>
                    </div>

                    <div
                        v-for="(payload, index) in settingsStore.settings.dump_order === 'normal'
                            ? group.slice().reverse()
                            : group"
                        :key="payload.id || payload.sf_dump_id"
                        :id="payload.id"
                        class="w-full"
                        :class="{
                            'mb-3': !groupMarginClass,
                            '-mt-3': groupMarginClass && settingsStore.settings.grouped_by_time && index === 0
                        }"
                    >
                        <DumpItem
                            class="w-full group text-sm"
                            v-show="listScreen !== 'livewire'"
                            :payload="payload"
                            :show-time="!settingsStore.settings.grouped_by_time"
                            :is-first="index === 0"
                        />
                    </div>
                </div>

                <DumpLivewire v-if="listScreen === 'livewire'" />
            </div>

            <div
                v-if="
                    dumpsBagFiltered.length === 0 &&
                    !(emptyScreenExclude ?? []).includes(listScreen) &&
                    !(listScreen === 'home' && payloadStore.payload.length === 0)
                "
                class="flex items-center justify-center w-full py-20"
            >
                <EmptyState />
            </div>
        </div>

        <div id="bottom"></div>

        <WelcomePage
            v-if="props.showWelcome && payloadStore.payload.length === 0 && listScreen === 'home'"
            class="w-full h-full"
        />
    </div>
</template>
