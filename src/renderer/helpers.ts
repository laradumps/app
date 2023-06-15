const isJson = (str: string): boolean => {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
};

// @ts-ignore
const escapeHtml = (content: string | undefined) => content.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export interface SearchSettings {
    is_case_sensitive: boolean;
    is_whole_word: boolean;
}

const strContains = (content: string, searchString: string, searchSettings: SearchSettings) => {
    // @see https://stackoverflow.com/questions/3446170/escape-string-for-use-in-javascript-regex
    searchString = searchString.replace(/[.*+?^$"{}()|[\]\\]/g, "\\$&");

    let regexExpression = searchString;
    let regexMode = "gim";

    if (searchSettings.is_case_sensitive) {
        regexMode = regexMode.replace("i", "");
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

export { isJson, strContains, escapeHtml };
