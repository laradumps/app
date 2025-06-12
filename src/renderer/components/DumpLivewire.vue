<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from "vue";
import DumpQuery from "@/components/DumpQuery.vue";
import VueJsonPretty from "vue-json-pretty";
import { useLivewireStore } from "@/store/livewire";
import { Payload } from "@/types/Payload";
import { Pane, Splitpanes } from "splitpanes";
import "splitpanes/dist/splitpanes.css";

const livewireStore = useLivewireStore();

const selected = ref<Payload | null>(null);
const updating = ref(false);
const focus = ref<string | null>(null);

const select = (value: string | undefined) => {
    nextTick(() => {
        const match = livewireStore.payload.find((request: Payload) => request.livewire && request.livewire.request === value);
        if (!match) return;

        selected.value = match;
        updating.value = true;

        const { livewire } = selected.value;
        if (!livewire) return;

        const sfDumpsErrorsId = livewire.errors?.[1];
        const sfDumpsPropertiesId = livewire.properties?.[1];

        let sfDump: HTMLElement | null;

        setTimeout(() => {
            if (sfDumpsErrorsId) {
                sfDump = document.getElementById(`sf-dump-${sfDumpsErrorsId}`);
                if (sfDump && !sfDump.hasAttribute("has-dump-js") && livewire.errors.length > 0) {
                    window.Sfdump?.(`sf-dump-${sfDumpsErrorsId}`);
                    sfDump.setAttribute("has-dump-js", "true");
                }
            }

            if (sfDumpsPropertiesId) {
                sfDump = document.getElementById(`sf-dump-${sfDumpsPropertiesId}`);
                if (sfDump && !sfDump.hasAttribute("has-dump-js") && livewire.properties.length > 0) {
                    window.Sfdump?.(`sf-dump-${sfDumpsPropertiesId}`);
                    sfDump.setAttribute("has-dump-js", "true");
                }
            }
        }, 50);
    });
};

const totalDuration = computed(() => {
    if (!selected.value?.livewire?.profile) return 0;

    const profile = selected.value.livewire.profile;
    let duration = 0;

    for (const method in profile) {
        const item = profile[method];
        if (Object.prototype.hasOwnProperty.call(profile, method) && item && typeof item.duration === "number" && !isNaN(item.duration)) {
            duration += item.duration;
        }
    }

    return duration;
});

const itemPercentage = (item: { duration: number }) => (totalDuration.value > 0 ? (item.duration / totalDuration.value) * 100 : 0);

const focusItem = (item: { method: string }) => {
    focus.value = item.method;
};

onMounted(() => {
    if (!updating.value && livewireStore.payload.length > 0) {
        const last = [...livewireStore.payload].reverse()[0];
        selected.value = last;
        last.livewire && select(last.livewire.request);
    }
});

const items = computed(() => {
    const items: Payload[] = livewireStore.payload.slice().reverse();

    return items;
});
</script>

<template>
    <div
        class="px-3 text-sm"
        v-if="livewireStore.payload.length > 0"
    >
        <div class="space-y-3 h-[calc(100vh-140px)]">
            <Splitpanes vertical>
                <pane
                    size="28"
                    class="overflow-auto pb-1 text-sm"
                >
                    <div
                        class="overflow-auto flex flex-col gap-1"
                        style="height: -webkit-fill-available"
                    >
                        <div
                            v-for="request in items"
                            :key="request.livewire?.request"
                            :id="request.livewire?.request"
                            :class="{
                                'hover:bg-base-300 hover:rounded-md': request?.livewire?.request !== selected?.livewire?.request,
                                'bg-neutral text-neutral-content rounded-md': request?.livewire?.request == selected?.livewire?.request
                            }"
                            class="p-2 space-y-2 cursor-pointer focus:bg-primary"
                            @click="select(request.livewire?.request)"
                        >
                            <div class="flex justify-between items-center cursor-pointer">
                                <div class="truncate">{{ request.livewire?.name }}</div>
                            </div>
                            <div class="font-semibold truncate">
                                {{ request.livewire?.size }}
                            </div>
                        </div>
                    </div>
                </pane>

                <pane class="overflow-auto ml-2 text-sm">
                    <div
                        v-if="selected?.livewire"
                        class="flex flex-col w-full space-y-2 !h-[calc(100vh-150px)]"
                    >
                        <div
                            role="tablist"
                            class="tabs tabs-box w-full"
                        >
                            <input
                                type="radio"
                                name="livewire_tab"
                                role="tab"
                                class="tab capitalize"
                                aria-label="Profile"
                                checked
                            />

                            <div
                                role="tabpanel"
                                class="tab-content bg-base-100 border-base-300 p-4"
                            >
                                <div class="overflow-x-auto flex flex-col gap-3 w-full">
                                    <div class="progress-container">
                                        <div
                                            v-for="(profile, index) in selected?.livewire.profile"
                                            :key="index"
                                            :class="[profile?.graphic_classes, { 'h-[32px] !opacity-100 shadow-lg': focus === profile?.method }]"
                                            class="progress-bar cursor-pointer opacity-60"
                                            @mouseover="focusItem(profile)"
                                            @mouseleave="focus = ''"
                                            :style="{ width: profile && typeof profile.duration === 'number' && !isNaN(profile.duration) ? itemPercentage(profile) + '%' : '0%' }"
                                            :title="profile && typeof profile.duration === 'number' && !isNaN(profile.duration) ? itemPercentage(profile).toFixed(1) + '%' : '0%'"
                                        ></div>
                                    </div>

                                    <div
                                        v-for="profile in selected?.livewire.profile"
                                        @mouseover="focusItem(profile)"
                                        @mouseleave="focus = ''"
                                        :class="[profile?.classes || {}, { 'bg-base-300 shadow-lg': focus === profile.method }, { hidden: !profile.hasOwnProperty('method') }]"
                                        class="border-l-4 cursor-pointer border items-center border-y-primary/10 hover:bg-base-200 hover:text-base-content flex justify-between rounded p-2 px-3"
                                    >
                                        <div class="font-semibold text-xs">{{ profile.method }}</div>
                                        <div>
                                            <span class="text-2xl">{{ profile.duration }}</span
                                            >ms
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <input
                                type="radio"
                                name="livewire_tab"
                                role="tab"
                                class="tab capitalize"
                                aria-label="Properties"
                            />
                            <div
                                role="tabpanel"
                                class="tab-content bg-base-100 border-base-300 p-3 overflow-auto"
                            >
                                <div v-html="selected.livewire.properties[0]"></div>
                            </div>

                            <input
                                v-if="selected.livewire.errors.length > 0"
                                type="radio"
                                name="livewire_tab"
                                role="tab"
                                class="tab capitalize"
                                aria-label="Validation"
                            />
                            <div
                                role="tabpanel"
                                class="tab-content bg-base-100 border-base-300 p-4"
                            >
                                <div v-html="selected.livewire.errors[0]"></div>
                            </div>

                            <input
                                v-if="selected.livewire.queries.length > 0"
                                type="radio"
                                name="livewire_tab"
                                role="tab"
                                class="tab capitalize"
                                aria-label="Queries"
                            />
                            <div
                                role="tabpanel"
                                class="tab-content bg-base-100 border-base-300 p-4 overflow-auto"
                            >
                                <DumpQuery
                                    v-for="query in selected.livewire.queries"
                                    class="w-full border-b border-base-300 mb-3 pb-3"
                                    :query="query"
                                />
                            </div>

                            <input
                                v-if="selected.livewire.events.length > 0"
                                type="radio"
                                name="livewire_tab"
                                role="tab"
                                class="tab capitalize"
                                aria-label="Events"
                            />
                            <div
                                role="tabpanel"
                                class="tab-content bg-base-100 border-base-300 p-4"
                            >
                                <div v-for="event in selected.livewire.events">
                                    <div class="font-normal tracking-wider text-sm">{{ event.name }}</div>

                                    <div class="p-3 rounded-sm">
                                        <VueJsonPretty
                                            class="!text-xs"
                                            :show-icon="true"
                                            :show-lenght="true"
                                            :show-line="false"
                                            :data="event.params"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </pane>
            </Splitpanes>
        </div>
    </div>
</template>
<style>
@reference "./../styles.css";

.progress-container {
    display: flex;
    align-items: center;
    height: 30px;
}

.progress-bar {
    height: 100%;
    margin: 2px !important;
    border-radius: 2px;
}

::v-deep(.splitpanes__splitter) {
    @apply opacity-0 hover:opacity-100 min-w-[0.2rem] bg-neutral/10 rounded-box hover:bg-secondary/60;
}
</style>
