<template>
    <div class="flex relative left-[3px] mr-[15px]">
        <div
            style="height: calc(100vh - 120px)"
            class="px-3 w-[40%] overflow-y-none overflow-y-auto rounded-sm dark:bg-base-900 text-base-600 dark:text-base-300 font-normal text-xs"
        >
            {{ $t("total") }}: {{ dumpsBag.length }}
            <div
                v-for="payload in dumpsBag"
                :key="payload.id"
            >
                <DumpLivewire
                    v-model:selected="selected"
                    @remove-livewire-highLight="removeLivewireHighLight($event)"
                    @selected-livewire-component="selectedLivewireComponent($event)"
                    :payload="payload"
                />
            </div>
        </div>

        <div
            v-if="typeof payload.content === 'undefined'"
            class="w-2/3 p-3 mb-4 flex justify-center items-center text-base-500 font-light"
        >
            {{ $t("please_select_a_component") }}
        </div>

        <div
            v-if="typeof payload.content !== 'undefined'"
            class="w-[60%] right-0 bg-base-50 dark:bg-base-800 p-3 align-middle items-start"
        >
            <div class="text-right dark:text-gray-300 flex justify-between text-sm text-gray-600">
                <div class="py-2 text-sm font-semibold text-left">
                    {{ payload.content.component.name }}
                </div>
                <div class="p-2 text-xs">
                    {{ payload.content.component.dateTime }}
                </div>
            </div>
            <div class="space-y-2">
                <div v-html="payload.content.component.data[0]"></div>
                <div class="space-y-2">
                    <div>
                        <DumpLink
                            :href="payload.content.component.viewHandler.handler"
                            :value="payload.content.component.viewHandler.path + `:` + payload.content.component.viewHandler.line"
                        />
                    </div>

                    <div>
                        <DumpLink
                            :href="payload.ide_handle.handler"
                            :title="`Open using ` + payload.ide_handle.ide"
                            :value="payload.ide_handle.path + `:` + payload.ide_handle.line"
                        />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { defineProps, ref, nextTick, onMounted } from "vue";
import DumpLivewire from "@/components/DumpLivewire.vue";
import DumpLink from "@/components/DumpLink.vue";

const payload = ref({});
const selected = ref("");
const rendered = ref([]);

const props = defineProps({
    dumpsBag: {
        type: Array,
        default: null
    }
});

onMounted(() => {
    selectedLivewireComponent(props.dumpsBag[props.dumpsBag.length - 1]);
});

const selectedLivewireComponent = (prop) => {
    selected.value = prop.content.component.id;
    payload.value = prop;

    if (prop.content.component.data.length > 0) {
        const dumpId = prop.content.component.data[1];

        nextTick(() => {
            if (!rendered.value.includes(dumpId) && document.getElementById(`sf-dump-${dumpId}`) !== null) {
                window.Sfdump(`sf-dump-${dumpId}`);
                rendered.value.push(dumpId);
            }

            if (window.Pusher) {
                window.Pusher.trigger("laradumps-livewire-channel", "highlight-component", {
                    id: prop.content.component.id,
                    component: prop.id
                });
            }
        });
    }
};
</script>

<style scoped>
.title {
    display: inline-block;

    text-transform: lowercase;
}

.title:first-letter {
    text-transform: uppercase;
}
</style>
