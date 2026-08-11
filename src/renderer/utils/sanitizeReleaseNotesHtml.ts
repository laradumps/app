const ALLOWED_TAGS = new Set([
    'H1',
    'H2',
    'H3',
    'H4',
    'H5',
    'H6',
    'P',
    'UL',
    'OL',
    'LI',
    'A',
    'STRONG',
    'EM',
    'B',
    'I',
    'CODE',
    'PRE',
    'BR',
    'TT'
]);

function escapeAttr(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

export function escapeHtml(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function sanitizeElement(el: Element): string {
    let result = '';

    for (const node of Array.from(el.childNodes)) {
        if (node.nodeType === Node.TEXT_NODE) {
            result += node.textContent ?? '';
            continue;
        }

        if (node.nodeType !== Node.ELEMENT_NODE) {
            continue;
        }

        const child = node as Element;
        const tag = child.tagName.toUpperCase();

        if (tag === 'BR') {
            result += '<br>';
            continue;
        }

        if (!ALLOWED_TAGS.has(tag)) {
            result += sanitizeElement(child);
            continue;
        }

        const inner = sanitizeElement(child);

        if (tag === 'A') {
            const href = child.getAttribute('href') ?? '';
            const safeHref = /^https?:\/\//i.test(href) ? href : '';

            result += safeHref ? `<a href="${escapeAttr(safeHref)}">${inner}</a>` : inner;
            continue;
        }

        const lower = tag.toLowerCase();
        result += `<${lower}>${inner}</${lower}>`;
    }

    return result;
}

export function isHtmlContent(value: string): boolean {
    return /<[a-z][\s\S]*>/i.test(value);
}

export function sanitizeReleaseNotesHtml(html: string): string {
    const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
    const root = doc.body.firstElementChild;

    if (!root) {
        return '';
    }

    return sanitizeElement(root).trim();
}
