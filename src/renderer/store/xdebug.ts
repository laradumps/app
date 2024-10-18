import { defineStore } from "pinia";
import { XDebugYml } from "@/types/XDebug";

type Current = {
    current: XDebugYml;
};

export const useXDebug = defineStore("xdebug", {
    state: (): Current => ({
        current: {}
    }),
    actions: {
        setCurrent(config) {
            this.current = config;
        }
    }
});
