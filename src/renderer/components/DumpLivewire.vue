<script setup lang="ts">
import { defineProps, nextTick, onMounted, ref } from "vue";
import SvgLivewire from "@/components/Svg/SvgLivewire.vue";

const props = defineProps<{
    livewireRequests: [];
}>();

const selected = ref({});

const select = (value) => {
    selected.value = props.livewireRequests.filter((req) => {
        return req.request_id === value;
    })[0];

    nextTick(() => {
        if (selected.value.livewire.content?.errors.length > 0) {
            window.Sfdump(`sf-dump-${selected.value.livewire.content.errors[1]}`);
        }

        if (selected.value.livewire.content?.properties.length > 0) {
            window.Sfdump(`sf-dump-${selected.value.livewire.content.properties[1]}`);
        }
    });
};
</script>

<template>
    <div
        v-if="livewireRequests.length > 0"
        class="flex px-3 gap-3 h-[77vh] overflow-auto divide-x"
    >
        <ul class="menu w-40 p-0 [&_li>*]:rounded-none [&_li>*]:py-0 text-lg">
            <li v-for="request in props.livewireRequests.slice().reverse()">
                <a
                    :class="{ 'font-semibold bg-primary text-primary-content': request.request_id == selected?.request_id }"
                    @click="select(request.request_id)"
                    ><{{ request.livewire.content.name }}></a
                >
            </li>
        </ul>

        <div class="w-full h-full px-3">
            <SvgLivewire class="flex absolute w-24 top-10 right-6" />

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
                    class="tab-content bg-base-100 border-base-300 rounded-box px-3 tracking-wider text-[0.65rem]"
                >
                    <div class="overflow-x-auto flex flex-col gap-3 w-full py-3">
                        <div
                            v-for="profile in selected?.livewire.content.profile"
                            :class="[profile.classes]"
                            class="border flex justify-between rounded p-2 px-3"
                        >
                            <div>{{ profile.method }}</div>
                            <div>
                                <span class="font-semibold text-sm">{{ profile.duration }}</span
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
            </div>
        </div>
    </div>
</template>

<style scoped></style>
