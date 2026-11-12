<script lang="ts" setup>
import { usePayloadStore } from '@/store/payload';
import { useScreenStore } from '@/store/screen';
import { useSettingsStore } from '@/store/settings';
import { Payload } from '@/types/Payload';
import DumpItem from '@/components/dumps/DumpItem.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import WelcomePage from '@/components/app/WelcomePage.vue';
import ViewToolbar from '@/components/common/ViewToolbar.vue';
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
const showEmpty = computed(
    () =>
        props.dumpsBagFiltered.length === 0 &&
        !props.emptyScreenExclude.includes(listScreen.value) &&
        !(listScreen.value === 'home' && payloadStore.payload.length === 0)
);
const showWelcomePage = computed(
    () => props.showWelcome && payloadStore.payload.length === 0 && listScreen.value === 'home'
);
const screenDumpCount = computed(() => payloadStore.get(listScreen.value).length);
</script>

<template>
    <div :class="[containerClass ?? 'flex flex-col rounded-sm text-base w-full h-full']">
        <div id="top"></div>

        <ViewToolbar
            v-if="!showWelcomePage"
            class="sticky top-0 z-80 shrink-0 bg-base-200"
            :count="dumpsBagFiltered.length"
            noun="dump"
            :can-clear="screenDumpCount > 0"
            @clear="payloadStore.clear(listScreen)"
        />

        <div
            :class="{
                'w-full': dumpsBagFiltered.length === 0 && listScreen !== 'home',
                'flex flex-1 flex-col': showEmpty
            }"
        >
            <div
                id="dumps-base"
                class="w-full mb-10"
                v-if="dumpsBagFiltered.length > 0"
                :class="{
                    'flex flex-col-reverse': settingsStore.settings.dump_order === 'normal',
                    'pt-2': !settingsStore.settings.grouped_by_time
                }"
            >
                <div
                    v-for="(group, groupKey, index) in groupedDumps"
                    :key="groupKey"
                    class="w-full"
                    :class="groupMarginClass ? { [groupMarginClass]: index === 0 } : {}"
                >
                    <div
                        v-if="settingsStore.settings.grouped_by_time"
                        class="z-70 flex items-center gap-2.5 pl-10 pr-4 py-2 text-xs bg-base-200 ld-on-surface backdrop-blur-md"
                        :class="groupStickyClass ?? (showWelcomePage ? 'sticky top-0' : 'sticky top-10')"
                    >
                        <ClockIcon class="absolute left-[13.5px] size-3.5 text-base-content/40" />
                        <span
                            class="tabular-nums tracking-wider text-base-content/70"
                            :title="groupKey"
                            >{{ dayjs(groupKey).format('HH:mm:ss') }}</span
                        >
                        <span class="h-px flex-1 bg-base-content/10"></span>
                        <span
                            class="shrink-0 rounded-full bg-base-content/10 px-2 py-0.5 font-mono text-[10px] text-base-content/50"
                            >{{ group.length }}</span
                        >
                    </div>

                    <div
                        v-for="(payload, index) in settingsStore.settings.dump_order === 'normal'
                            ? group.slice().reverse()
                            : group"
                        :key="payload.id || payload.sf_dump_id"
                        :id="payload.id"
                        class="w-full dump-cv"
                        :class="{
                            'mb-3': !groupMarginClass,
                            '-mt-3': groupMarginClass && settingsStore.settings.grouped_by_time && index === 0
                        }"
                    >
                        <DumpItem
                            class="w-full group text-sm"
                            :payload="payload"
                            :show-time="!settingsStore.settings.grouped_by_time"
                        />
                    </div>
                </div>
            </div>

            <div
                v-if="showEmpty"
                class="flex flex-1 items-center justify-center w-full py-20"
            >
                <EmptyState :screen="listScreen" />
            </div>
        </div>

        <div id="bottom"></div>

        <WelcomePage
            v-if="showWelcomePage"
            class="w-full h-full"
        />
    </div>
</template>

<style scoped>
.dump-cv {
    content-visibility: auto;
    contain-intrinsic-size: auto 120px;
}
</style>
