<template>
    <TransitionRoot
        as="template"
        :show="modalAttributes.open"
    >
        <Dialog
            as="div"
            class="relative z-300"
        >
            <TransitionChild
                as="template"
                enter="ease-out duration-300"
                enter-from="opacity-0"
                enter-to="opacity-100"
                leave="ease-in duration-200"
                leave-from="opacity-100"
                leave-to="opacity-0"
            >
                <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
            </TransitionChild>

            <div class="fixed inset-0 z-10 overflow-y-auto">
                <div class="flex min-h-full justify-center p-6 text-center items-center">
                    <TransitionChild
                        as="template"
                        enter="ease-out duration-300"
                        enter-from="opacity-0 tranbase-y-4 sm:tranbase-y-0 sm:scale-95"
                        enter-to="opacity-100 tranbase-y-0 sm:scale-100"
                        leave="ease-in duration-200"
                        leave-from="opacity-100 tranbase-y-0 sm:scale-100"
                        leave-to="opacity-0 tranbase-y-4 sm:tranbase-y-0 sm:scale-95"
                    >
                        <DialogPanel
                            class="relative transform overflow-hidden rounded-lg bg-white dark:bg-base-700 px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6"
                        >
                            <div>
                                <div class="mt-3 text-center sm:mt-5">
                                    <component
                                        v-if="modalAttributes.component"
                                        v-bind:is="modalAttributes.component"
                                        v-bind="{ ...modalAttributes.props }"
                                        @close="modalAttributes.open = false"
                                    >
                                    </component>
                                </div>
                            </div>
                            <div class="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3 text-center">
                                <slot name="actions" />

                                <button
                                    v-if="modalAttributes.cancelLabel"
                                    type="button"
                                    class="btn-white"
                                    @click="modalAttributes.open = false"
                                >
                                    {{ modalAttributes.cancelLabel }}
                                </button>
                            </div>
                        </DialogPanel>
                    </TransitionChild>
                </div>
            </div>
        </Dialog>
    </TransitionRoot>
</template>

<script setup>
import { Dialog, DialogPanel, TransitionChild, TransitionRoot } from "@headlessui/vue";

defineProps({
    modalAttributes: {
        type: Object,
        required: true
    }
});
</script>
