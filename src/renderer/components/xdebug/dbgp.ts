export type XDebugProperty = {
    name: string | null;
    fullname: string | null;
    type: string;
    classname: string | null;
    numchildren: number;
    value: string;
    children: XDebugProperty[];
};

const decodeBase64 = (value: string): string => {
    try {
        return new TextDecoder().decode(Uint8Array.from(atob(value), (char) => char.charCodeAt(0)));
    } catch {
        return value;
    }
};

export const encodeBase64 = (value: string): string => btoa(String.fromCharCode(...new TextEncoder().encode(value)));

export const quoteArg = (value: string): string => `"${value.replace(/["\\]/g, '\\$&')}"`;

export const parseProperty = (element: Element): XDebugProperty => {
    const type = element.getAttribute('type') ?? '';
    let value = Array.from(element.childNodes)
        .filter((node) => node.nodeType === Node.TEXT_NODE || node.nodeType === Node.CDATA_SECTION_NODE)
        .map((node) => node.nodeValue)
        .join('')
        .trim();

    if (element.getAttribute('encoding') === 'base64') value = decodeBase64(value);
    if (type === 'bool') value = value === '1' ? 'true' : 'false';

    return {
        name: element.getAttribute('name'),
        fullname: element.getAttribute('fullname'),
        type,
        classname: element.getAttribute('classname'),
        numchildren: Number(element.getAttribute('numchildren') ?? 0),
        value,
        children: Array.from(element.children)
            .filter((child) => child.tagName === 'property')
            .map(parseProperty)
    };
};

export const formatValue = ({ type, value }: XDebugProperty): string | null => {
    if (['array', 'object', 'uninitialized'].includes(type)) return null;
    if (type === 'null') return 'null';

    return type === 'string' ? `"${value}"` : value;
};
