import { defineStore } from "pinia";
import { Payload, ScreenPayload, LogApplicationPayload, TimeTrackPayload, ValidatePayload } from "@/types/Payload";
import * as Helper from "@/helpers";
import moment from "moment";
import humanizeDuration from "humanize-duration";

type State = {
    payload: Payload[];
};

export const usePayloadStore = defineStore("payload", {
    state: (): State => ({
        payload: []
    }),
    actions: {
        findPayloadIndex(id: string): number {
            return this.payload.findIndex((payload) => payload.id === id);
        },
        add(object: Payload) {
            this.payload.push(object);
        },
        get(screen: String) {
            return this.payload.filter((payload) => payload.screen?.screen_name === screen);
        },
        clear(screen: String) {
            this.payload = this.payload.filter((payload) => payload.screen?.screen_name !== screen);
        },
        clearAll() {
            this.payload = [];
        },
        updatePayload(content: { id: string; [key: string]: any }, field: string, transform?: (value: any) => any) {
            const index = this.findPayloadIndex(content.id);
            if (index !== -1) {
                this.payload[index] = {
                    ...this.payload[index],
                    [field]: transform ? transform(content[field]) : content[field]
                };
            }
        },
        updateColorPayload(content: { id: string; color: { color: string } }) {
            this.updatePayload(content, "color", (color) => color.color);
        },
        updateScreenPayload(content: { id: string; screen: ScreenPayload }) {
            this.updatePayload(content, "screen");
        },
        updateLogPayload(content: { id: string; log_application: LogApplicationPayload }) {
            const colorMap: Record<string, string> = {
                error: "red",
                critical: "red",
                alert: "red",
                emergency: "red",
                warning: "orange",
                notice: "green",
                info: "blue",
                debug: "gray"
            };
            const index = this.findPayloadIndex(content.id);
            if (index !== -1) {
                this.payload[index] = {
                    ...this.payload[index],
                    color: colorMap[content.log_application.level] || "",
                    label: content.log_application.level
                };
            }
        },
        updateJSONValidatePayload(content: { id: string; json_validate: any }) {
            this.updatePayload(content, "validate_json", () => true);
            const index = this.findPayloadIndex(content.id);
            if (index !== -1) {
                const toValidate = this.payload[index]?.dump?.original_content || this.payload[index]?.json?.original_content;
                this.payload[index].is_json = toValidate ? Helper.isJson(toValidate) : false;
            }
        },
        updateValidatePayload(content: { id: string; validate: ValidatePayload }) {
            const index = this.findPayloadIndex(content.id);
            if (index !== -1) {
                const textContent = this.payload[index]?.json?.original_content || this.payload[index]?.dump?.original_content;
                this.payload[index].str_contains = Helper.strContains(textContent, content.validate.content, {
                    is_case_sensitive: content.validate.is_case_sensitive,
                    is_whole_word: content.validate.is_whole_word
                });
            }
        },
        updateTimeTrackPayload(content: { id: string; time_track: TimeTrackPayload }) {
            const exist = this.payload.find((payload) => payload.label === content.time_track.label);
            const index = this.findPayloadIndex(content.id);
            if (index !== -1 && exist) {
                const duration = moment.duration(moment.unix(exist.time_track.time).diff(moment.unix(content.time_track.end_time)));
                this.payload[index].elapsed_time = humanizeDuration(duration.asMilliseconds());
            }
        },
        updateLabelPayload(content: { id: string; label: any }) {
            this.updatePayload(content, "label", (label) => label.label);
        }
    }
});
