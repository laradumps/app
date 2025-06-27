import { defineStore } from "pinia";

type State = {
    selectedLevels: string[];
};

export const useLogFilterStore = defineStore("logFilterStore", {
    state: (): State => ({
        selectedLevels: []
    }),
    actions: {
        toggleLevel(level: string) {
            if (this.selectedLevels.includes(level)) {
                this.selectedLevels = this.selectedLevels.filter((item) => item !== level);
            } else {
                this.selectedLevels.push(level);
            }
        },
        clear() {
            this.selectedLevels = [];
        },
        isSelected(level: string): boolean {
            return this.selectedLevels.includes(level);
        }
    },
    getters: {
        hasFilters: (state) => state.selectedLevels.length > 0
    }
});
