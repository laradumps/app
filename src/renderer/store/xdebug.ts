import { defineStore } from 'pinia';
import { XDebugYml } from '@/types/XDebug';

type Current = {
    current: XDebugYml;
};

export const useXDebug = defineStore('xdebug', {
    state: (): Current =>
        <Current>{
            current: {}
        },
    actions: {
        setCurrent(config: any) {
            this.current = config;
        }
    }
});
