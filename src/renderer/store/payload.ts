import { defineStore } from "pinia";
import { Payload, ScreenPayload, TimeTrackPayload, ValidatePayload } from "@/types/Payload";
import * as Helper from "@/helpers";
import moment from "moment";
import humanizeDuration from "humanize-duration";

export const usePayloadStore = defineStore("payload", {
    state: () => ({
        payload: [] as Payload[],
        filteredPayload: [] as Payload[]
    }),
    actions: {
        findPayloadIndex(id: string): number {
            return this.filteredPayload.findIndex((payload) => payload.id === id);
        },
        add(object: Payload) {
            this.payload.push(object);
        },
        get(screen: String) {
            return this.payload.filter((payload) => payload.to_screen.screen_name === screen);
        },
        findById(id: string) {
            return this.payload.findIndex((payload) => payload.id === id);
        },
        clear(screen: String) {
            this.payload = this.payload.filter((payload) => payload.to_screen.screen_name !== screen);
            this.filteredPayload = this.filteredPayload.filter((payload) => payload.to_screen.screen_name !== screen);
        },
        clearAll() {
            this.payload = [];
            this.filteredPayload = [];
        },
        updatePayload(content: { id: string; [key: string]: any }, field: string, transform?: (value: any) => any) {
            const indexPayload = this.findById(content.id);
            const indexFiltered = this.findPayloadIndex(content.id);

            if (indexPayload !== -1) {
                this.payload[indexPayload] = {
                    ...this.payload[indexPayload],
                    [field]: transform ? transform(content[field]) : content[field]
                };
            }

            if (indexFiltered !== -1) {
                this.filteredPayload[indexFiltered] = {
                    ...this.filteredPayload[indexFiltered],
                    [field]: transform ? transform(content[field]) : content[field]
                };
            }
        },
        updateColorPayload(content: { id: string; color: { color: string } }) {
            this.updatePayload(content, "color", (color) => color.color);
        },
        updateScreenPayload(content: { id: string; to_screen: ScreenPayload }) {
            this.updatePayload(content, "to_screen");
        },
        updateJSONValidatePayload(content: { id: string; json_validate: any }) {
            this.updatePayload(content, "validate_json", () => true);

            const indexPayload = this.findById(content.id);
            const indexFiltered = this.findPayloadIndex(content.id);

            if (indexPayload !== -1) {
                const toValidate = this.payload[indexPayload]?.dump?.original_content || this.payload[indexPayload]?.json?.original_content;
                this.payload[indexPayload].is_json = toValidate ? Helper.isJson(toValidate) : false;
            }

            if (indexFiltered !== -1) {
                const toValidate = this.filteredPayload[indexFiltered]?.dump?.original_content || this.filteredPayload[indexFiltered]?.json?.original_content;
                this.filteredPayload[indexFiltered].is_json = toValidate ? Helper.isJson(toValidate) : false;
            }
        },

        updateValidatePayload(content: { id: string; validate: ValidatePayload }) {
            const indexPayload = this.findById(content.id);
            const indexFiltered = this.findPayloadIndex(content.id);

            if (indexPayload !== -1) {
                const textContent = this.payload[indexPayload]?.json?.original_content || this.payload[indexPayload]?.dump?.original_content;
                this.payload[indexPayload].str_contains = Helper.strContains(textContent, content.validate.content, {
                    is_case_sensitive: content.validate.is_case_sensitive,
                    is_whole_word: content.validate.is_whole_word
                });
            }

            if (indexFiltered !== -1) {
                const textContent = this.filteredPayload[indexFiltered]?.json?.original_content || this.filteredPayload[indexFiltered]?.dump?.original_content;
                this.filteredPayload[indexFiltered].str_contains = Helper.strContains(textContent, content.validate.content, {
                    is_case_sensitive: content.validate.is_case_sensitive,
                    is_whole_word: content.validate.is_whole_word
                });
            }
        },

        updateTimeTrackPayload(content: { id: string; with_label: { label: string }; time_track: TimeTrackPayload }) {
            const exist = this.payload.find((payload) => payload.with_label.label === content.with_label.label);

            if (exist) {
                const indexPayload = this.findById(exist.id);
                const indexFiltered = this.findPayloadIndex(exist.id);

                if (indexPayload !== -1) {
                    const _end = moment.unix(Number(content.time_track.end_time));
                    const _start = moment.unix(Number(exist.time_track?.time));
                    const duration = moment.duration(_start.diff(_end));
                    this.payload[indexPayload].time_track.elapsed_time = humanizeDuration(duration.asMilliseconds());
                }

                if (indexFiltered !== -1) {
                    const _end = moment.unix(Number(content.time_track.end_time));
                    const _start = moment.unix(Number(exist.time_track?.time));
                    const duration = moment.duration(_start.diff(_end));
                    this.filteredPayload[indexFiltered].time_track.elapsed_time = humanizeDuration(duration.asMilliseconds());
                }
            }
        },
        updateLabelPayload(content: { id: string; label: any }) {
            this.updatePayload(content, "with_label");
        }
    }
});
