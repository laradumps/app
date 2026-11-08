import DOMPurify from 'dompurify';
import type { Directive } from 'vue';

export const sanitizeHtml = (html: unknown): string => DOMPurify.sanitize(html == null ? '' : String(html));

export const vSafeHtml: Directive<HTMLElement, unknown> = {
    mounted(el, { value }) {
        el.innerHTML = sanitizeHtml(value);
    },
    updated(el, { value, oldValue }) {
        if (value !== oldValue) el.innerHTML = sanitizeHtml(value);
    }
};
