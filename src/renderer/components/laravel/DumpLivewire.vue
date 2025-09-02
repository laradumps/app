<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from "vue";
import DumpQuery from "@/components/laravel/DumpQuery.vue";
import VueJsonPretty from "vue-json-pretty";
import { useLivewireStore } from "@/store/livewire";
import { LivewirePayload } from "@/types/Payload";
import { Pane, Splitpanes } from "splitpanes";
import "splitpanes/dist/splitpanes.css";

const livewireStore = useLivewireStore();

const selected = ref<LivewirePayload | null>(null);
const updating = ref(false);
const focus = ref<string | null>(null);

const select = (value: string | undefined) => {
    nextTick(() => {
        const match = livewireStore.requests.find((request: LivewirePayload) => request.request === value);
        if (!match) return;

        selected.value = match;
        updating.value = true;

        const sfDumpsErrorsId = selected.value.errors?.[1];
        const sfDumpsPropertiesId = selected.value.properties?.[1];

        let sfDump: HTMLElement | null;

        setTimeout(() => {
            if (sfDumpsErrorsId && selected.value) {
                sfDump = document.getElementById(`sf-dump-${sfDumpsErrorsId}`);
                if (sfDump && !sfDump.hasAttribute("has-dump-js") && selected.value.errors.length > 0) {
                    window.Sfdump?.(`sf-dump-${sfDumpsErrorsId}`);
                    sfDump.setAttribute("has-dump-js", "true");
                }
            }

            if (sfDumpsPropertiesId && selected.value) {
                sfDump = document.getElementById(`sf-dump-${sfDumpsPropertiesId}`);
                if (sfDump && !sfDump.hasAttribute("has-dump-js") && selected.value.properties.length > 0) {
                    window.Sfdump?.(`sf-dump-${sfDumpsPropertiesId}`);
                    sfDump.setAttribute("has-dump-js", "true");
                }
            }
        }, 50);
    });
};

const totalDuration = computed(() => {
    if (!selected.value || !selected.value.profile) return 0;

    const profile = selected.value.profile;
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
    nextTick(() => {
        if (!updating.value && livewireStore.requests.length > 0) {
            const last = [...livewireStore.requests].at(-1);
            if (last) {
                selected.value = last;
                select(last.request);
            }
        }
    });
});

const requests = computed(() => {
    const requests: LivewirePayload[] = livewireStore.requests.slice().reverse();

    return requests;
});
</script>

<template>
    <div
        class="px-3 text-sm"
        v-if="livewireStore.requests.length > 0"
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
                            v-for="request in requests"
                            :key="request.request"
                            :id="request.request"
                            :class="{
                                'hover:bg-base-300 hover:rounded-md': request.request !== selected?.request,
                                'border-primary text-primary rounded-xs bg-base-300': request.request == selected?.request
                            }"
                            class="p-2 space-y-2 cursor-pointer focus:bg-primary"
                            @click="select(request.request)"
                        >
                            <div class="flex justify-between items-center cursor-pointer">
                                <div class="truncate">{{ request.name }}</div>
                            </div>
                            <div class="font-semibold truncate">
                                {{ request.size }}
                            </div>
                        </div>
                    </div>
                </pane>

                <pane class="overflow-auto ml-2 text-sm">
                    <div
                        v-if="selected"
                        class="flex flex-col w-full space-y-2"
                    >
                        <div
                            role="tablist"
                            class="tabs tabs-lift w-full"
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
                                            v-for="(profile, index) in selected.profile"
                                            :key="index"
                                            :class="[profile?.graphic_classes, { 'h-[32px] !opacity-100 shadow-lg': focus === profile?.method }]"
                                            class="progress-bar cursor-pointer opacity-60"
                                            @mouseover="focusItem(profile)"
                                            @mouseleave="focus = ''"
                                            :style="{ width: profile && typeof profile.duration === 'number' && !isNaN(profile.duration) ? itemPercentage(profile) + '%' : '0%' }"
                                            :title="profile && typeof profile.duration === 'number' && !isNaN(profile.duration) ? itemPercentage(profile).toFixed(1) + '%' : '0%'"
                                        ></div>
                                    </div>

                                    <div class="overflow-auto space-y-1.5 h-[calc(100vh-15rem)]">
                                        <div
                                            v-for="profile in selected.profile"
                                            @mouseover="focusItem(profile)"
                                            @mouseleave="focus = ''"
                                            :class="[profile?.classes || {}, { 'bg-neutral text-neutral-content shadow-lg': focus === profile.method }, { hidden: !profile.hasOwnProperty('method') }]"
                                            class="border-l-4 !border-r-0 !border-y-base-200 cursor-pointer border items-center hover:bg-neutral hover:text-neutral-content flex justify-between rounded p-2 py-1"
                                        >
                                            <div class="font-semibold text-xs">{{ profile.method }}</div>
                                            <div>
                                                <span class="text-lg">{{ profile.duration }}</span
                                                >ms
                                            </div>
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
                                <div v-html="selected.properties[0]"></div>
                            </div>

                            <input
                                v-if="selected.errors.length > 0"
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
                                <div v-html="selected.errors[0]"></div>
                            </div>

                            <input
                                v-if="selected.queries.length > 0"
                                type="radio"
                                name="livewire_tab"
                                role="tab"
                                class="tab capitalize"
                                aria-label="Queries"
                            />
                            <div
                                role="tabpanel"
                                class="tab-content bg-base-100 border-base-300 p-4 overflow-auto max-h-[calc(100vh-184px)]"
                            >
                                <div>
                                    <div class="text-sm font-semibold text-base-content mb-2">{{ selected.queries.length }} Queries</div>

                                    <DumpQuery
                                        v-for="query in selected.queries"
                                        class="w-full border-b border-base-300 mb-3 pb-3"
                                        :query="query"
                                    />
                                </div>
                            </div>

                            <input
                                v-if="selected.events.length > 0"
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
                                <div v-for="event in selected.events">
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
@reference "./../../styles.css";

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

.splitpanes__splitter {
    @apply opacity-100 min-w-[0.2rem] rounded-box bg-base-300 hover:bg-base-100;
}

.border-blue-600 {
    border-color: #2563eb;
}

.bg-blue-600 {
    background-color: #2563eb;
}

.border-purple-400 {
    border-color: #a78bfa;
}

.bg-purple-400 {
    background-color: #a78bfa;
}

.border-green-600 {
    border-color: #16a34a;
}

.bg-green-600 {
    background-color: #16a34a;
}
</style>
