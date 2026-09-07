import { defineStore } from 'pinia';
import { ContextPayload, MailPayload } from '@/types/Payload';
import { IdeHandle } from '@/types/IdeHandle';
import { useSettingsStore } from '@/store/settings';

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
    context: ContextPayload;
    related_job?: { job_id: string; display_name: string };
    original_content?: string;
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
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    txt: 'text/plain',
    html: 'text/html'
};

export const useMailStore = defineStore('mailStore', {
    state: (): State => ({
        mails: JSON.parse(localStorage.getItem('emails') || '[]')
    }),
    actions: {
        addOrUpdateMail(
            payload: MailPayload,
            ide_handle: IdeHandle,
            context: ContextPayload,
            related_job?: { job_id: string; display_name: string }
        ) {
            const existingMailIndex = this.mails.findIndex((mail) => mail.message_id === payload.messageId);
            if (existingMailIndex === -1) {
                this._initialize(payload, ide_handle, context, related_job);
                this.store();

                return;
            }

            this.mails[existingMailIndex] = { ...this.mails[existingMailIndex], ...payload };
        },
        store() {
            localStorage.setItem('emails', JSON.stringify(this.mails));
        },
        clear() {
            this.mails = [];
            this.store();
        },
        remove(messageId: string) {
            const index = this.mails.findIndex((mail) => mail.message_id === messageId);
            if (index !== -1) {
                this.mails.splice(index, 1);
                this.store();
            }
        },
        _initialize(
            payload: MailPayload,
            ide_handle: IdeHandle,
            context: ContextPayload,
            related_job?: { job_id: string; display_name: string }
        ) {
            const date = new Date();
            const fromHeader = payload.headers.find((header: any) => header.startsWith('From:')) ?? '';
            const subjectHeader = payload.headers.find((header: any) => header.startsWith('Subject:')) ?? '';
            const toHeader = payload.headers.find((header: any) => header.startsWith('To:')) ?? '';

            const decodeMimeEncodedWord = (encodedText: string) => {
                return encodedText.replace(/=\?utf-8\?Q\?(.*?)\?=/gi, (match: any, content: any) => {
                    const decoded = content
                        .replace(/_/g, ' ')
                        .replace(/=([A-Fa-f0-9]{2})/g, (match: any, hex: any) =>
                            String.fromCharCode(parseInt(hex, 16))
                        );

                    return decodeURIComponent(escape(decoded));
                });
            };

            const regex = /From:\s*(.*)\s*<(.+)>/;
            const matches = fromHeader.match(regex) ?? [];
            const from = matches[1] ?? '';
            const fromMail = matches[2] ?? '';
            const subjectEncoded = subjectHeader.replace('Subject: ', '').trim();
            const subject = decodeMimeEncodedWord(subjectEncoded);

            const to = toHeader.replace('To: ', '').trim();

            const limit = useSettingsStore().settings.limit_dumps || 500;
            while (this.mails.length >= limit) {
                this.mails.shift();
            }

            this.mails.push({
                message_id: payload.messageId,
                from_mail: fromMail,
                subject,
                date,
                from,
                to,
                is_read: false,
                ...payload,
                ide_handle,
                context,
                related_job,
                original_content: payload.original_content
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
