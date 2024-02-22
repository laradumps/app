<template>
    <Listbox
        as="div"
        v-model="selected"
    >
        <div class="relative">
            <ListboxButton
                class="relative w-full h-[34px] cursor-default rounded-md border border-base-300 py-1.5 pl-3 pr-10 text-left shadow-sm focus:border-base-700 focus:outline-none focus:ring-1 focus:ring-base-500 sm:text-sm"
            >
                <span class="block truncate text-base-content">{{ selected?.label }}</span>
                <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                    <ChevronUpDownIcon
                        class="h-5 w-5 text-gray-400"
                        aria-hidden="true"
                    />
                </span>
            </ListboxButton>

            <transition
                leave-active-class="transition ease-in duration-100"
                leave-from-class="opacity-100"
                leave-to-class="opacity-0"
            >
                <ListboxOptions
                    class="absolute z-300 mt-1 max-h-60 w-full overflow-auto rounded-md bg-base-300 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm"
                >
                    <ListboxOption
                        as="template"
                        v-for="(item, index) in data"
                        :key="index"
                        :value="item"
                        v-slot="{ active, selected }"
                    >
                        <li :class="[active ? 'text-primary bg-base-600' : 'text-base-900', 'relative hover:text-base-900 cursor-pointer select-none py-2 pl-8 pr-4 text-xs']">
                            <span :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">{{ item.label }}</span>

                            <span
                                v-if="selected"
                                :class="[active ? 'text-primary' : 'text-base-600', 'absolute inset-y-0 left-0 flex items-center pl-1.5']"
                            >
                                <CheckIcon
                                    class="h-5 w-5"
                                    aria-hidden="true"
                                />
                            </span>
                        </li>
                    </ListboxOption>
                </ListboxOptions>
            </transition>
        </div>
    </Listbox>
</template>

<script setup>
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/vue";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/vue/20/solid";
import { nextTick, onMounted, ref, watch } from "vue";

const selected = ref(null);
const emit = defineEmits(["selected"]);

const props = defineProps({
    data: {
        type: Array,
        default: null
    },
    defaultValue: {
        type: Object,
        default: null
    }
});

watch(selected, (value) => {
    emit("selected", value);
});

onMounted(() => {
    nextTick(() => {
        selected.value = props.data[props.defaultValue] ?? props.data[0];
    });
});
</script>
