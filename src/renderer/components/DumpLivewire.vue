<script setup lang="ts">
import { computed, defineProps, nextTick, onMounted, onUnmounted, onUpdated, ref } from "vue";
import SvgLivewire from "@/components/Svg/SvgLivewire.vue";
import DumpQuery from "@/components/DumpQuery.vue";
import VueJsonPretty from "vue-json-pretty";

const props = defineProps<{
    livewireRequests: [];
}>();

const selected = ref({});
const sfDumps = ref([])
const updating = ref(false);

const select = (value: string) => {
    nextTick(() => {
        selected.value = props.livewireRequests.filter((request) => request.livewire.content.request === value)[0];

        updating.value = true;

        const sfDumpsErrorsId: string = selected.value.livewire.content.errors[1]
        const sfDumpsPropertiesId: string  = selected.value.livewire.content.properties[1]

        if (!sfDumps.value.includes(sfDumpsErrorsId) && selected.value.livewire.content?.errors.length > 0) {
            sfDumps.value.push(sfDumpsErrorsId)
            window.Sfdump(`sf-dump-${sfDumpsErrorsId}`);
        }

        if (!sfDumps.value.includes(sfDumpsPropertiesId) && selected.value.livewire.content?.properties.length > 0) {
            sfDumps.value.push(sfDumpsPropertiesId)
            window.Sfdump(`sf-dump-${sfDumpsPropertiesId}`);
        }
    });
};

onMounted(() => {
    if (!updating.value) {
        selected.value = props.livewireRequests.slice().reverse()[0] ?? [];
    }
});

onUnmounted(() => {
    sfDumps.value = []
})
</script>

<template>
    <div
        v-if="livewireRequests.length > 0"
        class="flex px-3 gap-3 h-fit divide-x divide-base-300"
    >
        <ul class="menu w-40 p-0 [&_li>*]:rounded-none [&_li>*]:py-0 text-lg">
            <li :key="request.livewire.content.request"
                :id="request.livewire.content.request"
                :class="{ 'font-semibold hover:bg-primary bg-primary text-primary-content': request?.livewire?.content.request == selected?.livewire?.content.request }"
                v-for="request in livewireRequests.slice().reverse()">
                <a
                    @click="select(request.livewire.content.request)"
                    ><{{ request.livewire.content.name }}></a
                >
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
                            v-for="profile in selected?.livewire.content.profile"
                            :class="[profile.classes]"
                            class="border-l-4 flex justify-between rounded p-2 px-3"
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
                    <div v-html="selected.livewire.content.properties[0]"></div>
                </div>

                <input
                    v-if="selected.livewire.content.errors.length > 0"
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
                    <div v-html="selected.livewire.content.errors[0]"></div>
                </div>

                <input
                    v-if="selected.livewire.content.queries.length > 0"
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
                        v-for="query in selected.livewire.content.queries"
                        class="w-full border-b mb-3 pb-3"
                        :query="query"
                    />
                </div>

                <input
                    v-if="selected.livewire.content.events.length > 0"
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
                    <div class="py-2" v-for="event in selected.livewire.content.events">
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
