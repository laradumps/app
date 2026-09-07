import { defineStore } from 'pinia';
import { markRaw } from 'vue';
import { Payload, ScreenPayload, TimeTrackPayload, ValidatePayload } from '@/types/Payload';
import { useGlobalSearchStore } from '@/store/global-search';
import { useColorStore } from '@/store/colors';
import * as Helper from '@/utils/helpers';
import { matchesDumpSearch } from '@/utils/searchMatchers';
import dayjs from 'dayjs';
import humanizeDuration from 'humanize-duration';

let payloadIds = [];
export const usePayloadStore = defineStore('payload', {
    state: () => ({
        payload: [] as Payload[],
        filteredPayload: [] as Payload[]
    }),
    getters: {
        dumpsBagFiltered(state): Payload[] {
            const search = useGlobalSearchStore().search.toLowerCase();
            const colorStore = useColorStore();

            return state.filteredPayload
                .filter((dump) => !search || matchesDumpSearch(dump, search))
                .filter((dump) => {
                    if (colorStore.colors.length > 0 && dump.color) {
                        return colorStore.colors.includes(dump.color);
                    }
                    return true;
                });
        }
    },
    actions: {
        findPayloadIndex(id: string): number {
            return this.filteredPayload.findIndex((payload) => payload.id === id);
        },
        add(object: Payload, activeScreen?: string, limit = 500) {
            if (!object.index) {
                object.index = String(payloadIds.length + 1);
                payloadIds.push(object.index);
            }

            const rawObject = markRaw(object);

            if (this.payload.length >= limit) {
                this.payload.shift();
            }

            this.payload.push(rawObject);

            if (rawObject.type !== 'screen' && activeScreen && rawObject.to_screen?.screen_name === activeScreen) {
                if (this.filteredPayload.length >= limit) {
                    this.filteredPayload.shift();
                }
                this.filteredPayload.push(rawObject);
            }
        },
        get(screen: String) {
            return this.payload.filter((payload) => payload.to_screen?.screen_name === screen);
        },
        findById(id: string) {
            return this.payload.findIndex((payload) => payload.id === id);
        },
        clear(screen: String) {
            this.payload = this.payload.filter((payload) => payload.to_screen?.screen_name !== screen);
            this.filteredPayload = this.filteredPayload.filter((payload) => payload.to_screen?.screen_name !== screen);
        },
        clearAll() {
            payloadIds = [];
            this.payload = [];
            this.filteredPayload = [];
        },
        recycle(maxItems: number) {
            if (this.payload.length > maxItems) {
                this.payload.splice(0, this.payload.length - maxItems);
            }
            const kept = new Set(this.payload.map((payload) => payload.id));
            this.filteredPayload = this.filteredPayload.filter((payload) => kept.has(payload.id));
        },
        updatePayload(content: { id: string; [key: string]: any }, field: string, transform?: (value: any) => any) {
            const indexPayload = this.findById(content.id);
            const indexFiltered = this.findPayloadIndex(content.id);

            if (indexPayload !== -1) {
                this.payload[indexPayload] = markRaw({
                    ...this.payload[indexPayload],
                    [field]: transform ? transform(content[field]) : content[field]
                });
            }

            if (indexFiltered !== -1) {
                this.filteredPayload[indexFiltered] = markRaw({
                    ...this.filteredPayload[indexFiltered],
                    [field]: transform ? transform(content[field]) : content[field]
                });
            }
        },
        updateColorPayload(content: { id: string; color: { color: string } }) {
            this.updatePayload(content, 'color', (color) => color.color);
        },
        updateScreenPayload(content: { id: string; to_screen: ScreenPayload }) {
            this.updatePayload(content, 'to_screen');
        },
        updateJSONValidatePayload(content: { id: string; json_validate: any }) {
            const apply = (item: Payload): Payload => {
                const toValidate = item?.dump?.original_content || item?.json?.original_content;
                return markRaw({
                    ...item,
                    validate_json: true,
                    is_json: toValidate ? Helper.isJson(toValidate) : false
                });
            };

            const indexPayload = this.findById(content.id);
            const indexFiltered = this.findPayloadIndex(content.id);

            if (indexPayload !== -1) {
                this.payload[indexPayload] = apply(this.payload[indexPayload]);
            }

            if (indexFiltered !== -1) {
                this.filteredPayload[indexFiltered] = apply(this.filteredPayload[indexFiltered]);
            }
        },
        updateValidatePayload(content: { id: string; validate: ValidatePayload }) {
            const apply = (item: Payload): Payload => {
                const textContent = item?.json?.original_content || item?.dump?.original_content;
                return markRaw({
                    ...item,
                    str_contains: Helper.strContains(textContent, content.validate.content, {
                        is_case_sensitive: content.validate.is_case_sensitive,
                        is_whole_word: content.validate.is_whole_word
                    })
                });
            };

            const indexPayload = this.findById(content.id);
            const indexFiltered = this.findPayloadIndex(content.id);

            if (indexPayload !== -1) {
                this.payload[indexPayload] = apply(this.payload[indexPayload]);
            }

            if (indexFiltered !== -1) {
                this.filteredPayload[indexFiltered] = apply(this.filteredPayload[indexFiltered]);
            }
        },
        updateTimeTrackPayload(content: { id: string; with_label: { label: string }; time_track: TimeTrackPayload }) {
            const exist = this.payload.find((payload) => payload.with_label?.label === content.with_label?.label);

            if (!exist) {
                return;
            }

            const _end = dayjs.unix(Number(content.time_track.end_time));
            const _start = dayjs.unix(Number(exist.time_track?.time));
            const elapsed = humanizeDuration(Math.abs(_end.diff(_start)));

            const apply = (item: Payload): Payload =>
                markRaw({
                    ...item,
                    time_track: { ...item.time_track, elapsed_time: elapsed }
                });

            const indexPayload = this.findById(exist.id);
            const indexFiltered = this.findPayloadIndex(exist.id);

            if (indexPayload !== -1) {
                this.payload[indexPayload] = apply(this.payload[indexPayload]);
            }

            if (indexFiltered !== -1) {
                this.filteredPayload[indexFiltered] = apply(this.filteredPayload[indexFiltered]);
            }
        },
        updateLabelPayload(content: { id: string; label: any }) {
            this.updatePayload(content, 'with_label');
        },
        clearCache() {
            this.payload = this.payload.filter((payload) => payload.to_screen?.screen_name !== 'cache');
            this.filteredPayload = this.filteredPayload.filter((payload) => payload.to_screen?.screen_name !== 'cache');
        },
        removePayload(id: string) {
            const indexPayload = this.findById(id);
            const indexFiltered = this.findPayloadIndex(id);

            if (indexPayload !== -1) {
                this.payload.splice(indexPayload, 1);
            }

            if (indexFiltered !== -1) {
                this.filteredPayload.splice(indexFiltered, 1);
            }
        }
    }
});
