<script setup lang="ts">
import { defineProps, nextTick, onMounted, onUnmounted, ref } from "vue";
import SvgLivewire from "@/components/Svg/SvgLivewire.vue";
import DumpQuery from "@/components/DumpQuery.vue";

const props = defineProps<{
    livewireRequests: [];
}>();

const selected = ref({});
const sfDumps = ref([])

const select = (value: string) => {
    selected.value = props.livewireRequests.filter((req) => req.request_id === value)[0];

    nextTick(() => {
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
            <li v-for="request in props.livewireRequests.slice().reverse()">
                <a
                    :class="{ 'font-semibold hover:bg-primary bg-primary text-primary-content': request.request_id == selected?.request_id }"
                    @click="select(request.request_id)"
                    ><{{ request.livewire.content.name }}></a
                >
            </li>

            <SvgLivewire class="fixed w-24 bottom-0" />
        </ul>

        <div class="w-full h-full px-3">

            <div
                v-if="selected.livewire"
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
                        class="w-full border-b py-3"
                        :query="query"
                    />
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped></style>
