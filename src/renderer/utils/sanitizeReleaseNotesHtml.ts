import DOMPurify from 'dompurify';

export function escapeHtml(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function isHtmlContent(value: string): boolean {
    return /<[a-z][\s\S]*>/i.test(value);
}

export function sanitizeReleaseNotesHtml(html: string): string {
    return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'li', 'a', 'strong', 'em', 'b', 'i', 'code', 'pre', 'br', 'tt'],
        ALLOWED_ATTR: ['href'],
        ALLOWED_URI_REGEXP: /^https?:\/\//i
    }).trim();
}
