<script setup lang="ts">
import { computed, defineProps, nextTick, onMounted, ref } from "vue";
import SvgLivewire from "@/components/Svg/SvgLivewire.vue";
import DumpQuery from "@/components/DumpQuery.vue";
import VueJsonPretty from "vue-json-pretty";

interface Livewire {
    name: string;
    size: string;
    request: string;
    errors: Array<any>;
    properties: Array<any>;
    profile: Array<any>;
    queries: Array<any>;
    events: Array<any>;
}

interface LivewireRequest {
    livewire: Livewire;
}

const props = defineProps<{
    livewireRequests: LivewireRequest[];
}>();

const selected = ref<LivewireRequest | null>(null);
const updating = ref(false);
const menuOpen = ref(true);
const focus = ref();

const select = (value: string) => {
    nextTick(() => {
        selected.value = props.livewireRequests.filter((request: LivewireRequest) => request.livewire.request === value)[0];

        updating.value = true;

        const sfDumpsErrorsId: string = selected.value.livewire.errors[1];
        const sfDumpsPropertiesId: string = selected.value.livewire.properties[1];

        let sfDump;

        setTimeout(() => {
            sfDump = document.getElementById(`sf-dump-${sfDumpsErrorsId}`);

            if (!sfDump?.hasAttribute("has-dump-js") && selected.value.livewire.errors.length > 0) {
                window.Sfdump(`sf-dump-${sfDumpsErrorsId}`);
                sfDump?.setAttribute("has-dump-js", "true");
            }

            sfDump = document.getElementById(`sf-dump-${sfDumpsPropertiesId}`);

            if (!sfDump?.hasAttribute("has-dump-js") && selected.value.livewire.properties.length > 0) {
                window.Sfdump(`sf-dump-${sfDumpsPropertiesId}`);
                sfDump?.setAttribute("has-dump-js", "true");
            }
        }, 50);
    });
};

const totalDuration = computed(() => {
    if (!selected.value || !selected.value.livewire || !selected.value.livewire.profile) return 0;

    const profile = selected.value.livewire.profile;
    let duration = 0;

    for (const method in profile) {
        if (profile.hasOwnProperty(method) && profile[method] && profile[method].duration !== undefined && typeof profile[method].duration === "number" && !isNaN(profile[method].duration)) {
            duration += profile[method].duration;
        }
    }

    return duration;
});

const itemPercentage = (item: { duration: number }) => (item.duration / totalDuration.value) * 100;

const focusItem = (item: { method: string }) => focus.value = item.method;

onMounted(() => {
    if (!updating.value) {
        selected.value = props.livewireRequests.slice().reverse()[0] ?? [];
        select(props.livewireRequests.slice().reverse()[0].livewire.request)
    }
});
</script>

<template>
    <div
        v-if="livewireRequests.length > 0"
        class="flex"
    >
        <!-- Listing -->
        <ul
            v-show="menuOpen"
            class="transition-all menu group relative overflow-auto h-[calc(100vh-9rem)] border-r border-base-200 block !px-3 !py-0 min-w-56 max-w-72 [&_li>*]:rounded-none [&_li>*]:py-1 [&_li>*]:!text-[0.70rem]"
        >
            <div
                @click="menuOpen = false"
                class="transition-all fixed hover:text-secondary cursor-pointer left-[212px] bottom-4 z-100"
            >
                <svg
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="currentColor"
                    class="w-6 h-6"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="m11.25 9-3 3m0 0 3 3m-3-3h7.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                    />
                </svg>
            </div>

            <li
                :key="request.livewire.request"
                :id="request.livewire.request"
                :class="{ 'font-semibold bg-base-300/40 !text-primary': request?.livewire?.request == selected?.livewire?.request }"
                class="text-base-content/80 hover:text-base-content"
                @click="select(request.livewire.request)"
                v-for="request in livewireRequests.slice().reverse()"
            >
                <a class="flex justify-between">
                    <span class="-ml-1 leading-6 whi text-sm font-normal"><{{ request.livewire.name }}></span>

                    <div
                        class="text-xs !font-semibold whitespace-nowrap"
                        v-text="`${request.livewire.size}`"
                    ></div>
                </a>
            </li>

            <SvgLivewire class="fixed w-20 bottom-0" />
        </ul>

        <!-- Details -->
        <div class="w-full px-3">
            <div
                v-show="!menuOpen"
                @click="menuOpen = true"
                class="transition-all fixed hover:text-secondary cursor-pointer left-2 bottom-4 z-100"
            >
                <svg
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="currentColor"
                    class="w-6 h-6"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="m12.75 15 3-3m0 0-3-3m3 3h-7.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                    />
                </svg>
            </div>

            <div
                v-if="selected?.livewire"
                role="tablist"
                class="tabs tabs-bordered w-full"
            >
                <input
                    type="radio"
                    name="livewire_tab"
                    role="tab"
                    class="tab uppercase font-normal tracking-wider text-[0.65rem]"
                    aria-label="Profile"
                    checked
                />
                <div
                    role="tabpanel"
                    class="tab-content bg-base-100 tracking-wider text-[0.70rem]"
                >
                    <div class="overflow-x-auto flex flex-col gap-3 w-full py-3">
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
                            :class="[profile.classes, { 'bg-base-300 shadow-lg': focus === profile.method }, { hidden: !profile.hasOwnProperty('method') }]"
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
                    class="tab uppercase font-normal tracking-wider text-[0.65rem]"
                    aria-label="Properties"
                />
                <div
                    role="tabpanel"
                    class="tab-content bg-base-100 py-3 overflow-auto"
                >
                    <div v-html="selected.livewire.properties[0]"></div>
                </div>

                <input
                    v-if="selected.livewire.errors.length > 0"
                    type="radio"
                    name="livewire_tab"
                    role="tab"
                    class="tab uppercase font-normal tracking-wider text-[0.65rem]"
                    aria-label="Validation"
                />
                <div
                    role="tabpanel"
                    class="tab-content bg-base-100 py-3"
                >
                    <div v-html="selected.livewire.errors[0]"></div>
                </div>

                <input
                    v-if="selected.livewire.queries.length > 0"
                    type="radio"
                    name="livewire_tab"
                    role="tab"
                    class="tab uppercase font-normal tracking-wider text-[0.65rem]"
                    aria-label="Queries"
                />
                <div
                    role="tabpanel"
                    class="tab-content bg-base-100 py-3 overflow-auto"
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
                    class="tab uppercase font-normal tracking-wider text-[0.65rem]"
                    aria-label="Events"
                />
                <div
                    role="tabpanel"
                    class="tab-content bg-base-100 py-3"
                >
                    <div
                        class="py-2"
                        v-for="event in selected.livewire.events"
                    >
                        <div class="font-normal tracking-wider text-sm">{{ event.name }}</div>

                        <div class="p-3 bg-base-200/30 rounded-sm">
                            <VueJsonPretty
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
    </div>
</template>
<style>
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
</style>
