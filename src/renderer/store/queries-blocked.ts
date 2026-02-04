import { defineStore } from 'pinia';

type State = {
    blocked: string[];
};

export const useQueriesBlockedStore = defineStore('queriesBlocked', {
    state: (): State => ({
        blocked: JSON.parse(localStorage.getItem('blocked') || '[]')
    }),
    actions: {
        toggle(sql: string) {
            this.blocked = this.blocked.includes(sql)
                ? this.blocked.filter((item) => item !== sql)
                : [...this.blocked, sql];

            localStorage.setItem('blocked', JSON.stringify(this.blocked));
        },
        unblock(sql: string) {
            this.blocked = this.blocked.filter((item) => item !== sql);
            localStorage.setItem('blocked', JSON.stringify(this.blocked));
        },
        clear() {
            this.blocked = [];
            localStorage.removeItem('blocked');
        }
    }
});
