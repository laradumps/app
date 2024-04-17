<script setup lang="ts">
import { defineProps, nextTick, onMounted, onUnmounted, ref } from "vue";
import SvgLivewire from "@/components/Svg/SvgLivewire.vue";
import DumpQuery from "@/components/DumpQuery.vue";
import VueJsonPretty from "vue-json-pretty";

const props = defineProps<{
    livewireRequests: [];
}>();

const selected = ref({});
const sfDumps = ref([]);
const updating = ref(false);

const select = (value: string) => {
    nextTick(() => {
        selected.value = props.livewireRequests.filter((request) => request.livewire.request === value)[0];

        updating.value = true;

        const sfDumpsErrorsId: string = selected.value.livewire.errors[1];
        const sfDumpsPropertiesId: string = selected.value.livewire.properties[1];

        setTimeout(() => {
            if (!sfDumps.value.includes(sfDumpsErrorsId) && selected.value.livewire.errors.length > 0) {
                // sfDumps.value.push(sfDumpsErrorsId);
                window.Sfdump(`sf-dump-${sfDumpsErrorsId}`);
            }

            if (!sfDumps.value.includes(sfDumpsPropertiesId) && selected.value.livewire.properties.length > 0) {
                // sfDumps.value.push(sfDumpsPropertiesId);
                window.Sfdump(`sf-dump-${sfDumpsPropertiesId}`);
            }
        }, 50)
    });
};

onMounted(() => {
    if (!updating.value) {
        selected.value = props.livewireRequests.slice().reverse()[0] ?? [];
    }
});

onUnmounted(() => {
    sfDumps.value = [];
});
</script>

<template>
    <div
        v-if="livewireRequests.length > 0"
        class="flex px-3 gap-3 h-full divide-x divide-base-300"
    >
        <ul class="menu overflow-auto max-h-[30rem] block w-72 sm:w-[28rem] lg:w-[50rem] p-0 [&_li>*]:rounded-none [&_li>*]:py-1 [&_li>*]:!text-[0.70rem]">
            <li
                :key="request.livewire.request"
                :id="request.livewire.request"
                :class="{ 'font-semibold bg-neutral !text-neutral-content': request?.livewire?.request == selected?.livewire?.request }"
                class="text-base-content/80 hover:text-base-content"
                @click="select(request.livewire.request)"
                v-for="request in livewireRequests.slice().reverse()"
            >
                <a class="flex justify-between">
                    <div
                        class="text-xs leading-6"
                        v-text="'<' + request.livewire.name + '>'"
                    ></div>
                    <div
                        class="text-xs !font-semibold whitespace-nowrap"
                        v-text="request.livewire.size"
                    ></div>
                </a>
            </li>

            <SvgLivewire class="fixed w-24 bottom-0" />
        </ul>

        <div class="w-full h-full px-3">
            <div
                v-if="selected?.livewire"
                role="tablist"
                class="tabs tabs-lifted w-full"
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
                    class="tab-content bg-base-100 border-base-300 rounded-box px-3 tracking-wider text-[0.70rem]"
                >
                    <div class="overflow-x-auto flex flex-col gap-3 w-full py-3">
                        <div
                            v-for="profile in selected?.livewire.profile"
                            :class="[profile.classes]"
                            class="border-l-4 hover:bg-neutral hover:text-neutral-content flex justify-between rounded p-2 px-3"
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
                    class="tab-content bg-base-100 border-base-300 rounded-box p-3"
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
                    class="tab-content bg-base-100 border-base-300 rounded-box p-3"
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
                    class="tab-content bg-base-100 border-base-300 rounded-box p-3"
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
                    class="tab-content bg-base-100 border-base-300 rounded-box p-3"
                >
                    <div
                        class="py-2"
                        v-for="event in selected.livewire.events"
                    >
                        <div class="font-semibold uppercase tracking-wider text-[0.65rem]">{{ event.name }}</div>

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

<style scoped></style>
