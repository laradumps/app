<script setup>
import { ref, nextTick, onMounted, onUnmounted } from "vue";
import { MagnifyingGlassIcon } from "@heroicons/vue/24/outline";
import { useGlobalSearchStore } from "@/store/global-search";

const showInput = ref(false);
const globalSearch = useGlobalSearchStore();
const inputRef = ref(null);

const toggleInputVisibility = async () => {
    showInput.value = !showInput.value;
    if (showInput.value) {
        await nextTick();
        inputRef.value?.focus();
    }
};

const handleKeydown = (event) => {
    if (event.key === "Escape") {
        showInput.value = false;
    }
};

const handleClickOutside = (event) => {
    if (showInput.value && !event.target.closest(".dropdown-content")) {
        showInput.value = false;
    }
};

onMounted(() => {
    window.addEventListener("keydown", handleKeydown);
    document.addEventListener("click", handleClickOutside);
});

onUnmounted(() => {
    window.removeEventListener("keydown", handleKeydown);
    document.removeEventListener("click", handleClickOutside);
});
</script>

<template>
    <div>
        <button
            tabindex="0"
            class="p-2 hover:bg-base-200 text-base-content cursor-pointer rounded-md"
            @click.stop="toggleInputVisibility"
        >
            <MagnifyingGlassIcon
                class="size-4"
                :class="{ 'text-primary': showInput || globalSearch.search.length > 0 }"
            />
        </button>

        <div
            :class="{ 'dropdown-open': showInput || globalSearch.search.length > 0 }"
            class="dropdown dropdown-left"
        >
            <div
                v-show="showInput"
                tabindex="0"
                class="dropdown-content z-300 menu p-2 bg-base-300 shadow-lg rounded-box w-60 mt-[8px] !right-0"
            >
                <input
                    ref="inputRef"
                    v-model="globalSearch.search"
                    type="text"
                    class="input input-sm rounded-md font-normal font-sans p-2"
                    placeholder="Search"
                />
            </div>
        </div>
    </div>
</template>
