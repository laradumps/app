import { defineStore } from "pinia";

type State = {
    colors: string[];
};

export const useColorStore = defineStore("colorStore", {
    state: (): State => ({
        colors: []
    }),
    actions: {
        add(color: string) {
            if (this.colors.includes(color)) {
                this.colors = this.colors.filter((item) => item !== color);
            } else {
                this.colors.push(color);
            }
        },
        clear() {
            this.colors = [];
        }
    }
});
