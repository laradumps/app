const isJson = (str) => {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
};

const escapeHtml = (content) => content.toString().replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const strContains = (content, searchString, searchSettings) => {
    // @see https://stackoverflow.com/questions/3446170/escape-string-for-use-in-javascript-regex
    searchString = searchString.replace(/[.*+?^$"{}()|[\]\\]/g, '\\$&');

    let regexExpression = searchString;
    let regexMode = 'gim';

    if (searchSettings.is_case_sensitive === true) {
        regexMode = regexMode.replace('i', '');
    }

    if (searchSettings.is_whole_word === true) {
        regexExpression = `(\\b${searchString}\\b)`;
    }

    const success = new RegExp(regexExpression, regexMode).test(content);

    return { success, regex: regexExpression, regex_mode: regexMode };
};

const searchElement = ($notificationId) => {
    return `
            <div class="relative rounded-md shadow-smw w-full">
                 <div class="absolute inset-y-0 left-0 p-2 flex items-center pointer-events-none text-slate-400">
                    <svg class="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                 </div>
                 <input id="search-${notificationId}" 
                        x-on:keyup="searchableTable('${notificationId}')" type="text" autocomplete="off"
                        placeholder="Search"
                        class="p-2 placeholder-gray-400 dark:bg-slate-800 dark:text-slate-400 dark:placeholder-gray-500 border border-slate-300 focus:ring-slate-600 focus:border-slate-500 dark:border-slate-600 form-input block w-full sm:text-sm rounded-md transition ease-in-out duration-100 focus:outline-none shadow-sm pl-8">
            </div>`;
};
const createTable = (objectArray, fields, fieldTitles, notificationId) => {
    const div = document.createElement('div');
    const search = document.createElement('div');
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const thr = document.createElement('tr');

    search.innerHTML = searchElement(notificationId);

    div.setAttribute('class', 'overflow-x-auto m-3 rounded-lg');
    table.setAttribute('id', `table-${notificationId}`);

    fieldTitles.forEach((fieldTitle) => {
        const th = document.createElement('th');
        th.appendChild(document.createTextNode(fieldTitle));
        thr.appendChild(th);
    });
    thead.appendChild(thr);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    let tr = document.createElement('tr');

    tbody.setAttribute('class', 'tbody');

    objectArray.forEach((object) => {
        tr = document.createElement('tr');

        fields.forEach((field) => {
            const td = document.createElement('td');
            td.appendChild(document.createTextNode(object[field]));
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    div.appendChild(search);
    div.appendChild(table);

    return div;
};

const createTableV2 = (values, notificationId) => {
    const div = document.createElement('div');
    const search = document.createElement('div');
    const table = document.createElement('table');

    search.innerHTML = searchElement(notificationId);

    div.setAttribute('class', 'overflow-x-auto m-3 rounded-lg');
    table.setAttribute('id', `table-${notificationId}`);

    const tbody = document.createElement('tbody');
    let tr = document.createElement('tr');

    tbody.setAttribute('class', 'tbody');

    Object.entries(values).forEach(([key, val]) => {
        tr = document.createElement('tr');

        const keyTd = document.createElement('td');
        keyTd.setAttribute('class', 'bg-gray-300');
        keyTd.appendChild(document.createTextNode(key));
        tr.appendChild(keyTd);

        const td = document.createElement('td');
        td.innerHTML = val;
        tr.appendChild(td);

        tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    div.appendChild(search);
    div.appendChild(table);

    return div;
};

export {
    isJson, strContains, escapeHtml, createTable, createTableV2,
};
