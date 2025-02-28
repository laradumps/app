import { defineStore } from "pinia";
import { MailPayload } from "@/types/Payload";
import { IdeHandle } from "@/types/IdeHandle";
import { useSettingsStore } from "@/store/settings";

export type Mail = {
    message_id: string;
    from_mail: string;
    from: string;
    to: string;
    date: Date;
    subject: string;
    is_read: boolean;
    headers: string[];
    details: string[];
    html: string;
    attachments: Attachment[];
    ide_handle: IdeHandle;
};

type State = {
    mails: Mail[];
};

export interface Attachment {
    path: string | null;
    filename: string | null;
    body: string | null;
}

export const mimeTypeMap: { [key: string]: string } = {
    pdf: "application/pdf",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    txt: "text/plain",
    html: "text/html"
};

export const useMailStore = defineStore("mailStore", {
    state: (): State => ({
        mails: JSON.parse(localStorage.getItem("emails") || "[]")
    }),
    actions: {
        addOrUpdateMail(payload: MailPayload, ide_handle: IdeHandle) {
            const existingMailIndex = this.mails.findIndex((mail) => mail.message_id === payload.messageId);
            if (existingMailIndex === -1) {
                this._initialize(payload, ide_handle);
                this.store();

                return;
            }

            this.mails[existingMailIndex] = { ...this.mails[existingMailIndex], ...payload };
        },
        store() {
            localStorage.setItem("emails", JSON.stringify(this.mails));
        },
        clear() {
            this.mails = [];
            this.store();
        },
        _initialize(payload: MailPayload, ide_handle: IdeHandle) {
            const date = new Date();
            const fromHeader = payload.headers.find((header) => header.startsWith("From:")) ?? "";
            const subjectHeader = payload.headers.find((header) => header.startsWith("Subject:")) ?? "";
            const toHeader = payload.headers.find((header) => header.startsWith("To:")) ?? "";

            const regex = /From:\s*(.*)\s*<(.+)>/;
            const matches = fromHeader.match(regex) ?? [];
            const from = matches[1] ?? "";
            const fromMail = matches[2] ?? "";
            const subject = subjectHeader.replace("Subject: ", "").trim();
            const to = toHeader.replace("To: ", "").trim();

            this.mails.push({
                message_id: payload.messageId,
                from_mail: fromMail,
                subject,
                date,
                from,
                to,
                is_read: false,
                ...payload,
                ide_handle
            });
        },
        visited(message_id: string) {
            const mail = this.mails.find((m) => m.message_id === message_id);
            if (mail) {
                mail.is_read = true;
            }
        }
    }
});
