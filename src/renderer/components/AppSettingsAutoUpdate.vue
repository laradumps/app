<template>
    <div>
        <label class="text-sm font-normal text-base-700 dark:text-base-400"> {{ $t("settings.check_for_updates") }} </label>

        <div class="mt-0">
            <SelectMenu
                @selected="changeAutoUpdateType($event.value)"
                :default-value="selectedAutoUpdateType"
                class="w-full !text-xs"
                v-model:data="types"
            />
        </div>
    </div>
</template>

<script setup>
import SelectMenu from "@/components/SelectMenu.vue";
import { computed, ref } from "vue";

const selected = ref("");

const types = ref([
    {
        value: "auto_download",
        label: "Automatic"
    },
    {
        value: "manual_download",
        label: "Manual Download"
    }
]);

const changeAutoUpdateType = (value) => {
    if (value !== undefined) {
        localStorage.autoUpdate = value;
    }
};

const selectedAutoUpdateType = computed(() => {
    return types.value.findIndex((type) => {
        return type.value === localStorage.autoUpdate;
    });
});
</script>
