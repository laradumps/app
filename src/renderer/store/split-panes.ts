import { defineStore } from "pinia";
import { ref } from "vue";

export const useSplitPanesStore = defineStore("split-panes", () => {
    const splitConfig = ref<{
        active: boolean;
        orientation: "vertical" | "horizontal";
        screenName: string;
    } | null>(null);

    const setSplit = (screenName: string, orientation: "vertical" | "horizontal") => {
        splitConfig.value = {
            active: true,
            orientation,
            screenName
        };
    };

    const clearSplit = () => {
        splitConfig.value = null;
    };

    return {
        splitConfig,
        setSplit,
        clearSplit
    };
});
