<script setup lang="ts">
import { defineProps, nextTick, onMounted, onUnmounted, ref } from "vue";
import SvgLivewire from "@/components/Svg/SvgLivewire.vue";
import DumpQuery from "@/components/DumpQuery.vue";
import VueJsonPretty from "vue-json-pretty";

const props = defineProps<{
    livewireRequests: [];
}>();

const selected = ref({});
const updating = ref(false);

const select = (value: string) => {
    nextTick(() => {
        selected.value = props.livewireRequests.filter((request) => request.livewire.request === value)[0];

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

onMounted(() => {
    if (!updating.value) {
        selected.value = props.livewireRequests.slice().reverse()[0] ?? [];
    }
});
</script>

<template>
    <div
        v-if="livewireRequests.length > 0"
        class="flex"
    >
        <!-- Listing -->
        <ul class="menu overflow-auto h-[calc(100vh-9rem)] border-b border-r border-base-200 block !px-3 !py-0 min-w-56 max-w-72 [&_li>*]:rounded-none [&_li>*]:py-1 [&_li>*]:!text-[0.70rem]">
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

            <SvgLivewire class="fixed w-24 bottom-0" />
        </ul>

        <!-- Details -->
        <div class="w-full px-3">
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
                        <div
                            v-for="profile in selected?.livewire.profile"
                            :class="[profile.classes]"
                            class="border-l-4 border border- border-y-primary/10 hover:bg-base-200 hover:text-base-content flex justify-between rounded p-2 px-3"
                        >
                            <div class="font-semibold capitalize">{{ profile.method }}</div>
                            <div>
                                <span class="text-lg">{{ profile.duration }}</span
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
                    aria-label="State"
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
