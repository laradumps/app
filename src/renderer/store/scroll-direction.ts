import { defineStore } from "pinia";

export const useScrollDirection = defineStore("scrollDirection", {
    state: () => {
        return {
            position: 'top' // bottom
        };
    },
    actions: {
        set(value: String) {
            this.position = value;
        },
        isTop() {
            return this.position === 'top'
        },
        isBottom() {
            return this.position === 'bottom'
        }
    }
});
