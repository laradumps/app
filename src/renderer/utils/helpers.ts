const isJson = (str: string | undefined): boolean => {
    if (typeof str === undefined) {
        return false;
    }

    try {
        if (str != null) {
            JSON.parse(str);
        }
    } catch (e) {
        return false;
    }
    return true;
};

const escapeHtml = (content: string | undefined): string =>
    (content ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

export interface SearchSettings {
    is_case_sensitive: boolean;
    is_whole_word: boolean;
}

const strContains = (content: string, searchString: string, searchSettings: SearchSettings) => {
    // @see https://stackoverflow.com/questions/3446170/escape-string-for-use-in-javascript-regex
    searchString = searchString.replace(/[.*+?^$"{}()|[\]\\]/g, '\\$&');

    let regexExpression = searchString;
    let regexMode = 'gim';

    if (searchSettings.is_case_sensitive) {
        regexMode = regexMode.replace('i', '');
    }

    if (searchSettings.is_whole_word) {
        regexExpression = `(\\b${searchString}\\b)`;
    }

    const success: boolean = new RegExp(regexExpression, regexMode).test(content);

    return {
        success,
        regex: regexExpression,
        regex_mode: regexMode,
        search_string: searchString
    };
};

const modifyHtml = (html: string, id: string): string => {
    const script = String.raw`
        <script type="module">
        document.addEventListener("DOMContentLoaded", function () {
            document.body.addEventListener("click", function (event) {
                const target = event.target.closest("a");
                if (target && target.href.startsWith("http")) {
                    event.preventDefault();
                    window.parent.postMessage({ type: "open-external-link-${id}", url: target.href }, "*");
                }
            });
        });
        </script>`;

    return html.replace('</body>', script + '</body>');
};

export { isJson, strContains, escapeHtml, modifyHtml };
