<script setup lang="ts">
import { defineProps, nextTick, onMounted, ref } from "vue";

const props = defineProps<{
    livewireRequests: [];
}>();

const selected = ref({});

const select = (value) => {
    selected.value = props.livewireRequests.filter((req) => {
        return req.request_id === value
    })[0]

    nextTick(() => {
        if (selected.value.livewire.content?.errors.length > 0) {
            window.Sfdump(`sf-dump-${selected.value.livewire.content.errors[1]}`)
        }

        if (selected.value.livewire.content?.properties.length > 0) {
            window.Sfdump(`sf-dump-${selected.value.livewire.content.properties[1]}`)
        }
    })
}

</script>

<template>
    <div v-if="livewireRequests.length > 0" class="flex p-3 gap-4 text-sm h-[77vh]">
        <ul class="menu bg-base-200 w-44 rounded-box">

            <li v-for="request in props.livewireRequests.slice().reverse()">
                <a :class="{ 'font-semibold bg-primary text-primary-content': request.request_id == selected?.request_id }"
                   @click="select(request.request_id)"
                   v-text="request.livewire.content.name "></a>
            </li>
        </ul>

        <div v-if="selected.livewire" class="w-full h-full">
            <div role="tablist" class="tabs tabs-bordered w-full">
                <input type="radio" name="my_tabs_1" role="tab" class="tab" aria-label="Profile" checked />
                <div role="tabpanel" class="tab-content">
                    <div class="overflow-x-auto flex flex-col gap-3 w-full p-3">

                        <div v-for="profile in selected?.livewire.content.profile"
                             :class="[profile.classes]"
                             class="flex justify-between rounded p-2 px-3">
                            <div>{{  profile.method }}</div>
                            <div>{{  profile.duration }}ms</div>
                        </div>
                    </div>
                </div>

                <input type="radio" name="my_tabs_1" role="tab" class="tab" aria-label="State" />
                <div role="tabpanel" class="tab-content p-3">
                    <div v-html="selected.livewire.content.properties[0]"></div>
                </div>

                <input type="radio" name="my_tabs_1" role="tab" class="tab" aria-label="Validation" />
                <div role="tabpanel" class="tab-content p-3">
                    <div v-html="selected.livewire.content.errors[0]"></div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>

</style>
