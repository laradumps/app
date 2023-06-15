<template>
    <div
        v-if="groups.length > 0"
        class="flex justify-between items-center gap-2 dark:text-slate-400"
    >
        <div class="-mr-2">
            <span>{{ totalPayload }}</span
            >/
        </div>
        <span class="font-semibold text-sm select-none">{{ total }}</span>

        <div class="flex gap-2 text-sm items-center">
            <SelectMenu
                @selected="setOrder($event.id)"
                class="w-[100px] dark:!bg-slate-600 !text-xs"
                v-model:data="queryOrder"
            />
            <SelectMenu
                @selected="setSelectedRequest($event.id)"
                class="w-[190px] !text-xs"
                v-model:data="allRequests"
            />
        </div>
    </div>
</template>

<script>
import { useTimeStore } from "@/store/time";
import { mapActions, mapState } from "pinia";
import SelectMenu from "@/components/SelectMenu.vue";

export default {
    name: "HeaderQueryRequests",
    components: {
        SelectMenu
    },
    mounted() {
        this.setSelectedRequest(this.allRequests[0]);
    },
    data() {
        return {
            totalPayload: 0
        };
    },
    props: {
        total: {
            type: Number,
            default: 0
        },
        payload: {
            type: Object
        }
    },
    watch: {
        selected(value) {
            this.totalPayload = this.payload.filter((payload) => payload.request_id === value).length;
        }
    },
    computed: {
        queryOrder() {
            return [
                {
                    id: false,
                    label: "default"
                },
                {
                    id: true,
                    label: "desc"
                },
                {
                    id: false,
                    label: "asc"
                }
            ];
        },
        allRequests() {
            const allRequests = [];
            this.groups.forEach((group, index) => {
                allRequests.push({
                    id: group,
                    label: "#" + (index + 1) + " - " + this.getTotal(group).toFixed(2) + "ms (" + this.getTime(group) + ")"
                });
            });
            return allRequests;
        },
        ...mapState(useTimeStore, ["requests", "groups", "selected"])
    },
    methods: {
        ...mapActions(useTimeStore, ["getTotal", "getCount", "getTime", "setSelectedRequest", "setOrder"])
    }
};
</script>
